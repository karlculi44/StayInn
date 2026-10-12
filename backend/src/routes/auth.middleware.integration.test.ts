import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";
import type { Role } from "@prisma/client";

const createdUserIds: string[] = [];

async function createTestUser(role: Role) {
  const user = await prisma.user.create({
    data: {
      firstName: "Auth",
      lastName: "Test",
      email: `auth-${randomUUID()}@example.com`,
      password: "test-password-hash",
      role,
    },
  });

  createdUserIds.push(user.id);
  return user;
}

function accessCookie(userId: string, role: Role) {
  const token = jwt.sign(
    { userId, role },
    env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "5m" },
  );

  return `accessToken=${token}`;
}

describe("Access-token user and role validation", () => {
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

  it("allows an existing user with the current admin role", async () => {
    const admin = await createTestUser("ADMIN");

    const response = await request(app)
      .get("/api/users")
      .set("Cookie", accessCookie(admin.id, "ADMIN"));

    expect(response.status).toBe(200);
  });

  it("rejects a token whose user no longer exists", async () => {
    const user = await createTestUser("GUEST");
    const cookie = accessCookie(user.id, "GUEST");
    await prisma.user.delete({ where: { id: user.id } });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(response.status).toBe(401);
  });

  it("does not let an old admin token retain privileges after demotion", async () => {
    const admin = await createTestUser("ADMIN");
    const cookie = accessCookie(admin.id, "ADMIN");

    await prisma.user.update({
      where: { id: admin.id },
      data: { role: "GUEST" },
    });

    const adminRouteResponse = await request(app)
      .get("/api/users")
      .set("Cookie", cookie);
    expect(adminRouteResponse.status).toBe(403);

    const authenticatedResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(authenticatedResponse.status).toBe(200);
    expect(authenticatedResponse.body.role).toBe("GUEST");
  });

  it("preserves role restrictions for guests and access for other admins", async () => {
    const guest = await createTestUser("GUEST");
    const admin = await createTestUser("ADMIN");

    const guestResponse = await request(app)
      .get("/api/users")
      .set("Cookie", accessCookie(guest.id, "GUEST"));
    expect(guestResponse.status).toBe(403);

    const adminResponse = await request(app)
      .get("/api/users")
      .set("Cookie", accessCookie(admin.id, "ADMIN"));
    expect(adminResponse.status).toBe(200);
  });
});
