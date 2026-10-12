import {
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";
import hashToken from "../utils/hashToken.js";

const createdUserIds: string[] = [];

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "Refresh",
      lastName: "Test",
      email: `refresh-${randomUUID()}@example.com`,
      password: await bcrypt.hash("refresh-test-password", 10),
    },
  });

  createdUserIds.push(user.id);
  return user;
}

async function createRefreshToken(
  userId: string,
  expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
) {
  const token = jwt.sign(
    { userId, jti: randomUUID() },
    env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  return token;
}

function refreshRequest(token: string) {
  return request(app)
    .post("/api/auth/refresh")
    .set("Origin", env.FRONTEND_URL)
    .set("Cookie", `refreshToken=${token}`);
}

function getSetCookieHeaders(
  headers: string | string[] | undefined,
): string[] {
  if (!headers) {
    throw new Error("Expected authentication cookies");
  }
  return Array.isArray(headers) ? headers : [headers];
}

function getCookiePair(
  headers: string | string[] | undefined,
  name: string,
): string {
  const header = getSetCookieHeaders(headers).find((value) =>
    value.startsWith(`${name}=`),
  );
  const cookiePair = header?.split(";")[0];

  if (!cookiePair) {
    throw new Error(`Expected ${name} cookie`);
  }

  return cookiePair;
}

function expectTestRefreshCookies(headers: string | string[] | undefined) {
  const cookies = getSetCookieHeaders(headers);
  expect(cookies).toHaveLength(2);

  for (const header of cookies) {
    expect(header).toMatch(/;\s*HttpOnly(?:;|$)/i);
    expect(header).toMatch(/;\s*SameSite=Lax(?:;|$)/i);
    expect(header).toMatch(/;\s*Path=\/(?:;|$)/i);
    expect(header).not.toMatch(/;\s*Secure(?:;|$)/i);
  }
}

describe("Refresh-token rotation and inactive-token handling", () => {
  afterEach(async () => {
    vi.restoreAllMocks();

    if (createdUserIds.length === 0) return;

    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rotates the stored hash and preserves the current test cookie policy", async () => {
    const user = await createTestUser();
    const oldToken = await createRefreshToken(user.id);

    const response = await refreshRequest(oldToken);

    expect(response.status).toBe(200);
    expectTestRefreshCookies(response.headers["set-cookie"]);

    const newTokenPair = getCookiePair(
      response.headers["set-cookie"],
      "refreshToken",
    );
    const newToken = newTokenPair.slice("refreshToken=".length);
    expect(
      await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(oldToken) },
      }),
    ).toBeNull();
    expect(
      await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(newToken) },
      }),
    ).not.toBeNull();
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(1);
  });

  it("rejects a rotated token and logs only a missing-record event without revoking other sessions", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const rotatedToken = await createRefreshToken(user.id);
    await createRefreshToken(user.id);
    await createRefreshToken(otherUser.id);

    const rotatedResponse = await refreshRequest(rotatedToken);
    expect(rotatedResponse.status).toBe(200);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const replayResponse = await refreshRequest(rotatedToken);

    expect(replayResponse.status).toBe(401);
    expect(warnSpy).toHaveBeenCalledWith("Refresh token record missing", {
      event: "refresh_token_record_missing",
      userId: user.id,
    });
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(2);
    expect(
      await prisma.refreshToken.count({ where: { userId: otherUser.id } }),
    ).toBe(1);
  });

  it("rejects unknown, JWT-expired, and database-expired refresh tokens", async () => {
    const user = await createTestUser();
    const unknownToken = jwt.sign(
      { userId: user.id, jti: randomUUID() },
      env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" },
    );
    const expiredJwt = jwt.sign(
      { userId: user.id, jti: randomUUID() },
      env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "-1s" },
    );
    const databaseExpiredToken = await createRefreshToken(
      user.id,
      new Date(Date.now() - 1000),
    );

    const unknownResponse = await refreshRequest(unknownToken);
    const expiredJwtResponse = await refreshRequest(expiredJwt);
    const databaseExpiredResponse = await refreshRequest(databaseExpiredToken);

    expect(unknownResponse.status).toBe(401);
    expect(expiredJwtResponse.status).toBe(401);
    expect(databaseExpiredResponse.status).toBe(401);
  });

  it("logs out only the presented refresh session while an access token remains valid until expiry", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const loggedOutRefreshToken = await createRefreshToken(user.id);
    const sameUserOtherSession = await createRefreshToken(user.id);
    const otherUserSession = await createRefreshToken(otherUser.id);
    const accessToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" },
    );

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", `refreshToken=${loggedOutRefreshToken}`);

    expect(logoutResponse.status).toBe(200);
    const clearedCookies = getSetCookieHeaders(
      logoutResponse.headers["set-cookie"],
    );
    expectTestRefreshCookies(clearedCookies);
    for (const cookie of clearedCookies) {
      expect(cookie).toMatch(/;\s*Expires=/i);
    }

    expect(
      await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(loggedOutRefreshToken) },
      }),
    ).toBeNull();
    expect(
      await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(sameUserOtherSession) },
      }),
    ).not.toBeNull();
    expect(
      await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(otherUserSession) },
      }),
    ).not.toBeNull();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reusedRefreshResponse = await refreshRequest(loggedOutRefreshToken);
    expect(reusedRefreshResponse.status).toBe(401);
    expect(warnSpy).toHaveBeenCalledWith("Refresh token record missing", {
      event: "refresh_token_record_missing",
      userId: user.id,
    });

    const accessResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `accessToken=${accessToken}`);
    expect(accessResponse.status).toBe(200);

    const expiredAccessToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "-1s" },
    );
    const expiredAccessResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `accessToken=${expiredAccessToken}`);
    expect(expiredAccessResponse.status).toBe(401);
  });

  it("allows only one of two concurrent refresh requests to rotate the same token", async () => {
    const user = await createTestUser();
    const token = await createRefreshToken(user.id);

    const responses = await Promise.all([
      refreshRequest(token),
      refreshRequest(token),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      401,
    ]);
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(1);
  });
});
