import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";

const createdUserIds: string[] = [];

function getSetCookieHeaders(response: request.Response): string[] {
  const headers = response.headers["set-cookie"];
  if (!headers) {
    throw new Error("Expected authentication cookies");
  }
  return Array.isArray(headers) ? headers : [headers];
}

function getCookiePair(headers: string[], name: string): string {
  const header = headers.find((value) => value.startsWith(`${name}=`));
  if (!header) {
    throw new Error(`Expected ${name} cookie`);
  }
  const cookiePair = header.split(";")[0];
  if (!cookiePair) {
    throw new Error(`Expected ${name} cookie`);
  }
  return cookiePair;
}

function expectLocalCookieOptions(headers: string[]) {
  expect(headers).toHaveLength(2);

  for (const header of headers) {
    expect(header).toMatch(/;\s*HttpOnly(?:;|$)/i);
    expect(header).toMatch(/;\s*SameSite=Lax(?:;|$)/i);
    expect(header).toMatch(/;\s*Path=\/(?:;|$)/i);
    expect(header).not.toMatch(/;\s*Secure(?:;|$)/i);
    expect(header).not.toMatch(/;\s*Domain=/i);
  }
}

describe("CSRF Origin protection and auth cookies", () => {
  afterEach(async () => {
    if (createdUserIds.length === 0) return;

    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("accepts registration from the configured frontend origin", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", env.FRONTEND_URL)
      .send({
        firstName: "Origin",
        lastName: "Test",
        email: `origin-${randomUUID()}@example.com`,
        password: "registration-test-password",
      });

    expect(response.status).toBe(201);
    createdUserIds.push(response.body.id);
  });

  it("rejects untrusted origins on authenticated and unauthenticated mutations", async () => {
    const untrustedOrigin = "https://attacker.example";

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .set("Origin", untrustedOrigin)
      .send({
        firstName: "Rejected",
        lastName: "Registration",
        email: `rejected-${randomUUID()}@example.com`,
        password: "registration-test-password",
      });

    const protectedResponse = await request(app)
      .patch("/api/auth/me/password")
      .set("Origin", untrustedOrigin)
      .send({});

    expect(registerResponse.status).toBe(403);
    expect(protectedResponse.status).toBe(403);
  });

  it("keeps login, refresh, and logout usable and clears cookies at the same path", async () => {
    const password = "session-test-password";
    const user = await prisma.user.create({
      data: {
        firstName: "Session",
        lastName: "Test",
        email: `session-${randomUUID()}@example.com`,
        password: await bcrypt.hash(password, 10),
      },
    });
    createdUserIds.push(user.id);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .set("Origin", env.FRONTEND_URL)
      .send({ email: user.email, password });

    expect(loginResponse.status).toBe(200);
    const loginCookies = getSetCookieHeaders(loginResponse);
    expectLocalCookieOptions(loginCookies);

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", getCookiePair(loginCookies, "refreshToken"));

    expect(refreshResponse.status).toBe(200);
    const refreshedCookies = getSetCookieHeaders(refreshResponse);
    expectLocalCookieOptions(refreshedCookies);

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", getCookiePair(refreshedCookies, "refreshToken"));

    expect(logoutResponse.status).toBe(200);
    const clearedCookies = getSetCookieHeaders(logoutResponse);
    expectLocalCookieOptions(clearedCookies);
    expect(clearedCookies.every((cookie) => /Expires=/i.test(cookie))).toBe(
      true,
    );
  });

  it("allows CORS preflight from the configured frontend origin", async () => {
    const response = await request(app)
      .options("/api/auth/refresh")
      .set("Origin", env.FRONTEND_URL)
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      env.FRONTEND_URL,
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows missing Origin for test clients while rejecting malformed values", async () => {
    const missingOriginResponse = await request(app).post("/api/auth/logout");
    const malformedOriginResponse = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "not-an-origin");

    expect(missingOriginResponse.status).toBe(200);
    expect(malformedOriginResponse.status).toBe(403);
  });
});
