import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";
import { removeProfilePicture } from "../services/profilePicture.js";

const pngImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/J1sAAAAASUVORK5CYII=",
  "base64",
);
const createdUserIds: string[] = [];
const storedPictureKeys = new Set<string>();

async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      firstName: "Picture",
      lastName: "Test",
      email: `picture-${randomUUID()}@example.com`,
      password: await bcrypt.hash("picture-test-password", 10),
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

async function uploadPicture(userId: string, image = pngImage) {
  return request(app)
    .put("/api/auth/me/profile-picture")
    .set("Origin", env.FRONTEND_URL)
    .set("Cookie", accessCookie(userId))
    .set("Content-Type", "image/png")
    .send(image);
}

describe("Authenticated profile picture upload", () => {
  afterEach(async () => {
    for (const key of storedPictureKeys) {
      await removeProfilePicture(key);
    }
    storedPictureKeys.clear();

    if (createdUserIds.length === 0) return;

    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    createdUserIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores a validated picture for the authenticated user and serves it back", async () => {
    const user = await createTestUser();
    const uploadResponse = await uploadPicture(user.id);

    expect(uploadResponse.status).toBe(200);
    expect(uploadResponse.body.profilePictureUrl).toMatch(
      /^\/api\/auth\/me\/profile-picture\?v=/,
    );
    const storedKey = new URL(
      uploadResponse.body.profilePictureUrl,
      "http://localhost",
    ).searchParams.get("v");
    if (!storedKey) {
      throw new Error("Profile picture key was not returned");
    }
    storedPictureKeys.add(storedKey);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePicture: true },
    });
    expect(updatedUser?.profilePicture).toBe(storedKey);

    const pictureResponse = await request(app)
      .get("/api/auth/me/profile-picture")
      .set("Cookie", accessCookie(user.id));
    expect(pictureResponse.status).toBe(200);
    expect(pictureResponse.headers["content-type"]).toContain("image/png");
    expect(pictureResponse.headers["cross-origin-resource-policy"]).toBe(
      "cross-origin",
    );
    expect(pictureResponse.body).toEqual(pngImage);

    const profileResponse = await request(app)
      .get("/api/auth/me")
      .set("Cookie", accessCookie(user.id));
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.profilePictureUrl).toBe(
      uploadResponse.body.profilePictureUrl,
    );
  });

  it("only updates the account authenticated by the session", async () => {
    const owner = await createTestUser();
    const otherUser = await createTestUser();

    const response = await uploadPicture(owner.id);
    expect(response.status).toBe(200);
    const storedKey = new URL(
      response.body.profilePictureUrl,
      "http://localhost",
    ).searchParams.get("v");
    if (!storedKey) {
      throw new Error("Profile picture key was not returned");
    }
    storedPictureKeys.add(storedKey);

    const otherAccount = await prisma.user.findUnique({
      where: { id: otherUser.id },
      select: { profilePicture: true },
    });
    expect(otherAccount?.profilePicture).toBeNull();
  });

  it("rejects unauthenticated, unsupported, and spoofed image uploads", async () => {
    const user = await createTestUser();
    const unauthenticatedResponse = await request(app)
      .put("/api/auth/me/profile-picture")
      .set("Content-Type", "image/png")
      .send(pngImage);
    expect(unauthenticatedResponse.status).toBe(401);

    const unsupportedTypeResponse = await request(app)
      .put("/api/auth/me/profile-picture")
      .set("Origin", env.FRONTEND_URL)
      .set("Cookie", accessCookie(user.id))
      .set("Content-Type", "image/svg+xml")
      .send("<svg></svg>");
    expect(unsupportedTypeResponse.status).toBe(415);

    const spoofedTypeResponse = await uploadPicture(
      user.id,
      Buffer.from("<script>alert(1)</script>"),
    );
    expect(spoofedTypeResponse.status).toBe(400);

    const oversizedResponse = await uploadPicture(
      user.id,
      Buffer.alloc(env.PROFILE_IMAGE_MAX_SIZE_MB * 1024 * 1024 + 1),
    );
    expect(oversizedResponse.status).toBe(413);

    const untouchedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePicture: true },
    });
    expect(untouchedUser?.profilePicture).toBeNull();
  });
});
