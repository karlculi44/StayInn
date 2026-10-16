import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/runtime.js";

let adminId = "";
let guestId = "";
let roomTypeId = "";
let roomId = "";
let adminToken = "";
let guestToken = "";

const authenticate = (userId: string, role: "ADMIN" | "GUEST") =>
  jwt.sign({ userId, role }, env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: "5m" });

describe("Room status integration tests", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        firstName: "Room",
        lastName: "Admin",
        email: `room-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const guest = await prisma.user.create({
      data: {
        firstName: "Room",
        lastName: "Guest",
        email: `room-guest-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "GUEST",
      },
    });
    guestId = guest.id;

    adminToken = authenticate(adminId, "ADMIN");
    guestToken = authenticate(guestId, "GUEST");

    const roomType = await prisma.roomType.create({
      data: {
        name: `Room Status Test ${randomUUID()}`,
        description: "Temporary room type for room status tests",
        capacity: 2,
        pricePerNight: "100.00",
      },
    });
    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `RS-${randomUUID()}`,
        roomTypeId,
      },
    });
    roomId = room.id;
  });

  afterAll(async () => {
    if (roomId) {
      await prisma.roomStatusHistory.deleteMany({
        where: { roomId },
      });

      await prisma.room.deleteMany({
        where: { id: roomId },
      });
    }

    if (roomTypeId) {
      await prisma.roomType.deleteMany({
        where: { id: roomTypeId },
      });
    }

    if (adminId || guestId) {
      await prisma.user.deleteMany({
        where: {
          id: { in: [adminId, guestId].filter(Boolean) },
        },
      });
    }

    await prisma.$disconnect();
  });

  it("allows an admin to change a room's status", async () => {
    const response = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        status: "MAINTENANCE",
        reason: "Integration test maintenance",
      });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("MAINTENANCE");

    const savedRoom = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
    });

    expect(savedRoom.status).toBe("MAINTENANCE");
  });

  it("rejects a guest attempting to change a room's status", async () => {
    const response = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set("Cookie", `accessToken=${guestToken}`)
      .send({
        status: "AVAILABLE",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  it("rejects an invalid room status", async () => {
    const response = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        status: "OCCUPIED",
      });

    expect(response.status).toBe(400);
  });

  it("requires a reason when setting a room to maintenance", async () => {
    const response = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        status: "MAINTENANCE",
      });

    expect(response.status).toBe(400);
  });

  it("records the admin and details of a room status change", async () => {
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "AVAILABLE" },
    });

    const reason = "Audit history integration test";

    const response = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        status: "MAINTENANCE",
        reason,
      });

    expect(response.status).toBe(200);

    const history = await prisma.roomStatusHistory.findFirstOrThrow({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });

    expect(history.previousStatus).toBe("AVAILABLE");
    expect(history.newStatus).toBe("MAINTENANCE");
    expect(history.reason).toBe(reason);
    expect(history.adminId).toBe(adminId);
  });

  it("does not create an audit record when the status is unchanged", async () => {
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "AVAILABLE" },
    });

    const historyCountBefore = await prisma.roomStatusHistory.count({
      where: { roomId },
    });

    const response = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        status: "AVAILABLE",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("AVAILABLE");

    const historyCountAfter = await prisma.roomStatusHistory.count({
      where: { roomId },
    });

    expect(historyCountAfter).toBe(historyCountBefore);
  });
});
