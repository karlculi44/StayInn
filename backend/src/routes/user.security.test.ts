import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

let testUserId = "";
let accessToken: string;

beforeAll(async () => {
  const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
  }

  const admin = await prisma.user.create({
    data: {
      firstName: "Security",
      lastName: "Admin",
      email: `security-admin-${randomUUID()}@example.com`,
      password: "test-password-hash",
      role: "ADMIN",
    },
  });
  testUserId = admin.id;

  accessToken = jwt.sign(
    {
      userId: testUserId,
      role: "ADMIN",
    },
    secret,
    { expiresIn: "5m" },
  );
});

afterAll(async () => {
  if (testUserId) {
    await prisma.user.deleteMany({ where: { id: testUserId } });
  }
  await prisma.$disconnect();
});

describe("Admin self-protection", () => {
  it("prevents an admin from changing their own role", async () => {
    const response = await request(app)
      .patch(`/api/users/${testUserId}/role`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({ role: "GUEST" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("You cannot change your own role");
  });

  it("prevents an admin from deleting their own account", async () => {
    const response = await request(app)
      .delete(`/api/users/${testUserId}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("You cannot delete your own account");
  });
});
