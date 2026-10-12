import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

let testRoomTypeId = "";
let testRoomId = "";
let accessToken = "";
const createdUserIds: string[] = [];

const futureDate = (daysFromNow: number) => {
  const date = new Date();
  date.setHours(14, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const createTestUser = async () => {
  const user = await prisma.user.create({
    data: {
      firstName: "Reservation",
      lastName: "Tester",
      email: `reservation-${randomUUID()}@example.com`,
      password: "test-password",
      role: "GUEST",
    },
  });

  createdUserIds.push(user.id);
  return user;
};

const createExistingReservation = async (
  userId: string,
  checkIn: Date,
  checkOut: Date,
  status: "PENDING" | "CONFIRMED" | "CANCELLED" = "CONFIRMED",
) => {
  return prisma.reservation.create({
    data: {
      userId,
      roomId: testRoomId,
      checkIn,
      checkOut,
      guests: 2,
      totalAmount: "200.00",
      status,
    },
  });
};

const bookRoom = async (
  userId: string,
  checkIn: Date,
  checkOut: Date,
  guests = 2,
  roomId = testRoomId,
) => {
  const token = jwt.sign(
    {
      userId,
      role: "GUEST",
    },
    process.env.JWT_ACCESS_TOKEN_SECRET as string,
    { expiresIn: "5m" },
  );

  return request(app)
    .post("/api/reservations")
    .set("Cookie", `accessToken=${token}`)
    .send({
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests,
      roomId,
    });
};

describe("Reservation booking integration tests", () => {
  beforeAll(async () => {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }

    accessToken = jwt.sign(
      {
        userId: "reservation-test-admin",
        role: "ADMIN",
      },
      secret,
      { expiresIn: "5m" },
    );

    const roomType = await prisma.roomType.create({
      data: {
        name: `Reservation Test ${randomUUID()}`,
        description: "Temporary room type for booking tests",
        capacity: 2,
        pricePerNight: "100.00",
      },
    });

    testRoomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `RT-${randomUUID()}`,
        roomTypeId: testRoomTypeId,
      },
    });

    testRoomId = room.id;
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
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
    }

    // Remove any remaining reservations attached to this test room.
    if (testRoomId) {
      await prisma.reservation.deleteMany({
        where: { roomId: testRoomId },
      });
    }
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

  it("creates a valid reservation and calculates the total", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(30);
    const checkOut = futureDate(32);

    const response = await bookRoom(user.id, checkIn, checkOut);

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(user.id);
    expect(response.body.roomId).toBe(testRoomId);
    expect(Number(response.body.totalAmount)).toBe(200);
  });

  it("allows only one of two simultaneous overlapping bookings", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const checkIn = futureDate(100);
    const checkOut = futureDate(102);

    // Both guests attempt to book the same room for the same dates.
    const responses = await Promise.all([
      bookRoom(userA.id, checkIn, checkOut),
      bookRoom(userB.id, checkIn, checkOut),
    ]);

    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409]);

    const conflictResponse = responses.find(
      (response) => response.status === 409,
    );

    expect(conflictResponse?.body.message).toBe(
      "Room is already booked for the selected dates",
    );

    // Verify that exactly one active reservation exists for this period.
    const activeReservationCount = await prisma.reservation.count({
      where: {
        roomId: testRoomId,
        status: { not: "CANCELLED" },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });

    expect(activeReservationCount).toBe(1);
  });

  it("rejects overlapping reservations", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(40);
    const checkOut = futureDate(43);

    await createExistingReservation(user.id, checkIn, checkOut);

    const response = await bookRoom(user.id, futureDate(41), futureDate(44));

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Room is already booked for the selected dates",
    );
  });

  it("allows back-to-back reservations", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(50);
    const checkOut = futureDate(52);

    await createExistingReservation(user.id, checkIn, checkOut);

    const response = await bookRoom(user.id, checkOut, futureDate(54));

    expect(response.status).toBe(201);
  });

  it("allows booking dates occupied only by a cancelled reservation", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(60);
    const checkOut = futureDate(62);

    await createExistingReservation(user.id, checkIn, checkOut, "CANCELLED");

    const response = await bookRoom(user.id, checkIn, checkOut);

    expect(response.status).toBe(201);
  });

  it("rejects booking a room that is not available", async () => {
    const user = await createTestUser();

    await prisma.room.update({
      where: { id: testRoomId },
      data: { status: "MAINTENANCE" },
    });

    try {
      const response = await bookRoom(user.id, futureDate(70), futureDate(72));

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Room is not available for booking");
    } finally {
      await prisma.room.update({
        where: { id: testRoomId },
        data: { status: "AVAILABLE" },
      });
    }
  });

  it("rejects a booking that exceeds room capacity", async () => {
    const user = await createTestUser();

    const response = await bookRoom(user.id, futureDate(80), futureDate(82), 3);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Number of guests exceeds room capacity of 2",
    );
  });

  it("returns 404 when the requested room does not exist", async () => {
    const user = await createTestUser();

    const response = await bookRoom(
      user.id,
      futureDate(90),
      futureDate(92),
      2,
      randomUUID(),
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Room not found");
  });
});
