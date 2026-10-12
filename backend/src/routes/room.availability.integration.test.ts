import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { generateReservationReferenceId } from "../utils/reservationReference.js";

function futureDate(daysFromToday: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(14, 0, 0, 0);
  return date;
}

describe("GET /api/rooms/availability", () => {
  let roomTypeId: string;
  let userId: string;

  let testRooms: {
    available: string;
    overlapping: string;
    cancelled: string;
    backToBack: string;
    inactive: string;
  } = {
    available: "",
    overlapping: "",
    cancelled: "",
    backToBack: "",
    inactive: "",
  };

  const checkIn = futureDate(10);
  const checkOut = futureDate(12);

  beforeAll(async () => {
    const roomType = await prisma.roomType.create({
      data: {
        name: `Availability Test ${randomUUID()}`,
        description: "Temporary room type for availability tests",
        capacity: 2,
        pricePerNight: 100,
      },
    });

    roomTypeId = roomType.id;

    const user = await prisma.user.create({
      data: {
        firstName: "Availability",
        lastName: "Tester",
        email: `availability-${randomUUID()}@example.com`,
        password: "test-password-hash",
      },
    });

    userId = user.id;

    const roomCases = [
      ["available", "AVAILABLE"],
      ["overlapping", "AVAILABLE"],
      ["cancelled", "AVAILABLE"],
      ["backToBack", "AVAILABLE"],
      ["inactive", "INACTIVE"],
    ] as const;

    for (const [key, status] of roomCases) {
      const room = await prisma.room.create({
        data: {
          roomNumber: `AT-${randomUUID().slice(0, 8)}`,
          roomTypeId,
          status,
        },
      });

      testRooms[key] = room.id;
    }

    await prisma.reservation.createMany({
      data: [
        {
          checkIn: futureDate(11),
          checkOut: futureDate(13),
          guests: 2,
          totalAmount: 200,
          referenceId: generateReservationReferenceId(),
          userId,
          roomId: testRooms.overlapping,
          status: "CONFIRMED",
        },
        {
          checkIn,
          checkOut,
          guests: 2,
          totalAmount: 200,
          referenceId: generateReservationReferenceId(),
          userId,
          roomId: testRooms.cancelled,
          status: "CANCELLED",
        },
        {
          checkIn: futureDate(8),
          checkOut: checkIn,
          guests: 2,
          totalAmount: 200,
          referenceId: generateReservationReferenceId(),
          userId,
          roomId: testRooms.backToBack,
          status: "CONFIRMED",
        },
      ],
    });
  });

  afterAll(async () => {
    const roomIds = Object.values(testRooms);

    if (roomIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: { roomId: { in: roomIds } },
      });

      await prisma.room.deleteMany({
        where: { id: { in: roomIds } },
      });
    }

    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }

    if (roomTypeId) {
      await prisma.roomType.deleteMany({
        where: { id: roomTypeId },
      });
    }

    await prisma.$disconnect();
  });

  it("returns available rooms and excludes overlapping or inactive rooms", async () => {
    const response = await request(app).get("/api/rooms/availability").query({
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
    });

    expect(response.status).toBe(200);

    const returnedRoomIds = response.body.map(
      (room: { id: string }) => room.id,
    );

    expect(returnedRoomIds).toContain(testRooms.available);
    expect(returnedRoomIds).toContain(testRooms.cancelled);
    expect(returnedRoomIds).toContain(testRooms.backToBack);

    expect(returnedRoomIds).not.toContain(testRooms.overlapping);
    expect(returnedRoomIds).not.toContain(testRooms.inactive);
  });

  it("does not expose reservation data in public availability results", async () => {
    const response = await request(app).get("/api/rooms/availability").query({
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: testRooms.available,
          roomType: expect.objectContaining({ id: roomTypeId }),
        }),
      ]),
    );

    for (const room of response.body) {
      expect(room).not.toHaveProperty("reservations");
    }

    expect(JSON.stringify(response.body)).not.toContain(userId);
  });

  it("rejects a request with missing dates", async () => {
    const response = await request(app)
      .get("/api/rooms/availability")
      .query({ checkIn: checkIn.toISOString() });

    expect(response.status).toBe(400);
  });

  it("rejects invalid date values", async () => {
    const response = await request(app).get("/api/rooms/availability").query({
      checkIn: "not-a-date",
      checkOut: checkOut.toISOString(),
    });

    expect(response.status).toBe(400);
  });

  it("rejects a check-out date that is not after check-in", async () => {
    const response = await request(app).get("/api/rooms/availability").query({
      checkIn: checkIn.toISOString(),
      checkOut: checkIn.toISOString(),
    });

    expect(response.status).toBe(400);
  });
});
