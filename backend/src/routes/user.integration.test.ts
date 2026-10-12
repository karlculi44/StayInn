import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";

const createdUserIds: string[] = [];

let testRoomTypeId = "";
let testRoomId = "";
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

    // This ID represents the authenticated admin making the requests.
    accessToken = jwt.sign(
      {
        userId: "integration-test-admin",
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
