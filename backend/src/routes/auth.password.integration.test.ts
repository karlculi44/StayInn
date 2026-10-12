import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";
import hashToken from "../utils/hashToken.js";

const originalPassword = "original-test-password";
const createdUserIds: string[] = [];

async function createTestUser(password = originalPassword) {
  const user = await prisma.user.create({
    data: {
      firstName: "Password",
      lastName: "Test",
      email: `password-${randomUUID()}@example.com`,
      password: await bcrypt.hash(password, 10),
    },
  });

  createdUserIds.push(user.id);
  return user;
}

async function createSession(userId: string) {
  const accessToken = jwt.sign(
    { userId, role: "GUEST" },
    env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" },
  );
  const refreshToken = jwt.sign(
    { userId },
    env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
) {
  return request(app)
    .patch("/api/auth/me/password")
    .set("Cookie", `accessToken=${accessToken}`)
    .send({ currentPassword, newPassword });
}

describe("Password change session revocation", () => {
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

  it("updates the password and removes the user's refresh-token records", async () => {
    const user = await createTestUser();
    const session = await createSession(user.id);

    const response = await changePassword(
      session.accessToken,
      originalPassword,
      "replacement-test-password",
    );

    expect(response.status).toBe(200);
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });
    if (!updatedUser) {
      throw new Error("User not found after password change");
    }
    expect(
      await bcrypt.compare("replacement-test-password", updatedUser.password),
    ).toBe(true);

    const remainingTokens = await prisma.refreshToken.count({
      where: { userId: user.id },
    });
    expect(remainingTokens).toBe(0);
  });

  it("preserves sessions when password verification or validation fails", async () => {
    const user = await createTestUser();
    const session = await createSession(user.id);

    const wrongCurrentPasswordResponse = await changePassword(
      session.accessToken,
      "incorrect-test-password",
      "replacement-test-password",
    );
    expect(wrongCurrentPasswordResponse.status).toBe(401);

    const invalidNewPasswordResponse = await changePassword(
      session.accessToken,
      originalPassword,
      "short",
    );
    expect(invalidNewPasswordResponse.status).toBe(400);

    const remainingTokens = await prisma.refreshToken.count({
      where: { userId: user.id },
    });
    expect(remainingTokens).toBe(1);
  });

  it("rejects a refresh token issued before the password change", async () => {
    const user = await createTestUser();
    const session = await createSession(user.id);

    const passwordChangeResponse = await changePassword(
      session.accessToken,
      originalPassword,
      "replacement-test-password",
    );
    expect(passwordChangeResponse.status).toBe(200);

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${session.refreshToken}`);

    expect(refreshResponse.status).toBe(401);
  });

  it("leaves other users' refresh-token records untouched", async () => {
    const changedUser = await createTestUser();
    const otherUser = await createTestUser();
    const changedUserSession = await createSession(changedUser.id);
    await createSession(otherUser.id);

    const response = await changePassword(
      changedUserSession.accessToken,
      originalPassword,
      "replacement-test-password",
    );
    expect(response.status).toBe(200);

    const [changedUserTokenCount, otherUserTokenCount] = await Promise.all([
      prisma.refreshToken.count({ where: { userId: changedUser.id } }),
      prisma.refreshToken.count({ where: { userId: otherUser.id } }),
    ]);
    expect(changedUserTokenCount).toBe(0);
    expect(otherUserTokenCount).toBe(1);
  });
});
