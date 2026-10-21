import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../app.js";
import { generateReservationReferenceId } from "../utils/reservationReference.js";
import {
  removeProfilePicture,
  storeProfilePicture,
} from "../services/profilePicture.js";

const createdUserIds: string[] = [];
const storedPictureKeys = new Set<string>();
const pngImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/J1sAAAAASUVORK5CYII=",
  "base64",
);

let testRoomTypeId = "";
let testRoomId = "";
let testAdminId = "";
let accessToken = "";

const createTestUser = async () => {
  const user = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      email: `test-${randomUUID()}@example.com`,
      password: "test-password",
      role: "GUEST",
    },
  });

  createdUserIds.push(user.id);

  return user;
};

describe("User management integration tests", () => {
  beforeAll(async () => {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }

    const admin = await prisma.user.create({
      data: {
        firstName: "Integration",
        lastName: "Admin",
        email: `integration-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    testAdminId = admin.id;

    accessToken = jwt.sign(
      {
        userId: admin.id,
        role: "ADMIN",
      },
      secret,
      { expiresIn: "5m" },
    );

    const roomType = await prisma.roomType.create({
      data: {
        name: `Vitest Room Type ${randomUUID()}`,
        description: "Temporary room type for integration tests",
        capacity: 2,
        pricePerNight: "100.00",
      },
    });

    testRoomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `TEST-${randomUUID()}`,
        roomTypeId: testRoomTypeId,
      },
    });

    testRoomId = room.id;
  });

  afterEach(async () => {
    for (const key of storedPictureKeys) {
      await removeProfilePicture(key);
    }
    storedPictureKeys.clear();

    if (createdUserIds.length === 0) return;

    // Remove reservations before deleting their users.
    await prisma.reservation.deleteMany({
      where: {
        userId: { in: createdUserIds },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: createdUserIds },
      },
    });

    createdUserIds.length = 0;
  });

  afterAll(async () => {
    if (testRoomId) {
      await prisma.room.delete({
        where: { id: testRoomId },
      });
    }

    if (testRoomTypeId) {
      await prisma.roomType.delete({
        where: { id: testRoomTypeId },
      });
    }

    if (testAdminId) {
      await prisma.user.delete({
        where: { id: testAdminId },
      });
    }

    await prisma.$disconnect();
  });

  it("allows an admin to update another user's role", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .patch(`/api/users/${user.id}/role`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("ADMIN");

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.role).toBe("ADMIN");
  });

  it("returns each user's profile picture and serves it only to admins", async () => {
    const user = await createTestUser();
    const initialListResponse = await request(app)
      .get("/api/users")
      .set("Cookie", `accessToken=${accessToken}`);

    expect(initialListResponse.status).toBe(200);
    expect(
      initialListResponse.body.find(
        (listedUser: { id: string }) => listedUser.id === user.id,
      ).profilePictureUrl,
    ).toBeNull();

    const pictureKey = await storeProfilePicture(pngImage, "png");
    storedPictureKeys.add(pictureKey);
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: pictureKey },
    });

    const listResponse = await request(app)
      .get("/api/users")
      .set("Cookie", `accessToken=${accessToken}`);
    const listedUser = listResponse.body.find(
      (entry: { id: string }) => entry.id === user.id,
    );

    expect(listResponse.status).toBe(200);
    expect(listedUser.profilePictureUrl).toBe(
      `/api/users/${user.id}/profile-picture?v=${encodeURIComponent(pictureKey)}`,
    );
    expect(listedUser).not.toHaveProperty("profilePicture");

    const pictureResponse = await request(app)
      .get(`/api/users/${user.id}/profile-picture`)
      .set("Cookie", `accessToken=${accessToken}`);
    expect(pictureResponse.status).toBe(200);
    expect(pictureResponse.headers["content-type"]).toContain("image/png");
    expect(pictureResponse.body).toEqual(pngImage);

    const unauthenticatedResponse = await request(app).get(
      `/api/users/${user.id}/profile-picture`,
    );
    expect(unauthenticatedResponse.status).toBe(401);

    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }
    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      secret,
      { expiresIn: "5m" },
    );
    const guestResponse = await request(app)
      .get(`/api/users/${user.id}/profile-picture`)
      .set("Cookie", `accessToken=${guestToken}`);
    expect(guestResponse.status).toBe(403);
  });

  it("allows an admin to create a user with a hashed password and safe response", async () => {
    const password = "secure-create-password";
    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        firstName: "Created",
        lastName: "User",
        email: `created-${randomUUID()}@example.com`,
        password,
        role: "GUEST",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      firstName: "Created",
      lastName: "User",
      role: "GUEST",
    });
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("passwordHash");
    createdUserIds.push(response.body.id);

    const createdUser = await prisma.user.findUnique({
      where: { id: response.body.id },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.password).not.toBe(password);
    expect(await bcrypt.compare(password, createdUser!.password)).toBe(true);
  });

  it("rejects creating a user with an already registered email", async () => {
    const existingUser = await createTestUser();
    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        firstName: "Another",
        lastName: "User",
        email: existingUser.email,
        password: "secure-password",
        role: "GUEST",
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email unavailable");
  });

  it("rejects invalid create-user input", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        firstName: "",
        lastName: "User",
        email: "invalid-email",
        password: "short",
        role: "SUPERADMIN",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  it("rejects user creation by non-admin users", async () => {
    const guest = await createTestUser();
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }
    const guestToken = jwt.sign(
      { userId: guest.id, role: "GUEST" },
      secret,
      { expiresIn: "5m" },
    );

    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${guestToken}`)
      .send({
        firstName: "Blocked",
        lastName: "User",
        email: `blocked-${randomUUID()}@example.com`,
        password: "secure-password",
        role: "GUEST",
      });

    expect(response.status).toBe(403);
  });

  it("allows deletion of a user without reservations", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(204);

    const deletedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(deletedUser).toBeNull();
  });

  it("rejects deletion of a user with reservations", async () => {
    const user = await createTestUser();

    await prisma.reservation.create({
      data: {
        referenceId: generateReservationReferenceId(),
        checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        guests: 1,
        totalAmount: "100.00",
        userId: user.id,
        roomId: testRoomId,
      },
    });

    const response = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "User has existing reservations and cannot be deleted",
    );

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(existingUser).not.toBeNull();
  });

  it("returns 404 when deleting a nonexistent user", async () => {
    const nonexistentUserId = randomUUID();

    const response = await request(app)
      .delete(`/api/users/${nonexistentUserId}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });
});
