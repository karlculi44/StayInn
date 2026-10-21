import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";

const createdUserIds: string[] = [];

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "Profile",
      lastName: "Test",
      email: `profile-${randomUUID()}@example.com`,
      password: await bcrypt.hash("profile-test-password", 10),
    },
  });

  createdUserIds.push(user.id);
  return user;
}

function accessCookie(userId: string) {
  const token = jwt.sign(
    { userId, role: "GUEST" },
    env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "5m" },
  );

  return `accessToken=${token}`;
}

describe("Authenticated profile updates", () => {
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

  it("updates the authenticated user's name and email", async () => {
    const user = await createTestUser();
    const email = `updated-${randomUUID()}@example.com`;

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", accessCookie(user.id))
      .send({
        firstName: "Updated",
        lastName: "Profile",
        email: ` ${email} `,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: user.id,
      firstName: "Updated",
      lastName: "Profile",
      email,
    });
  });

  it("rejects an email address already used by another account", async () => {
    const user = await createTestUser();
    const existingUser = await createTestUser();

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", accessCookie(user.id))
      .send({ email: existingUser.email });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email unavailable");

    const unchangedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    expect(unchangedUser?.email).toBe(user.email);
  });

  it("rejects an invalid email address", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .patch("/api/auth/me")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", accessCookie(user.id))
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
  });
});
