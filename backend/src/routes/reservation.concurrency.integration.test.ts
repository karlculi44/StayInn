import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { generateReservationReferenceId } from "../utils/reservationReference.js";

describe("Reservation database concurrency protection", () => {
  let roomTypeId = "";
  let roomId = "";
  let userId = "";
  let firstReservationId = "";

  beforeAll(async () => {
    const roomType = await prisma.roomType.create({
      data: {
        name: `Concurrency Test ${randomUUID()}`,
        description: "Temporary room type for concurrency tests",
        capacity: 2,
        pricePerNight: 100,
      },
    });

    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `CT-${randomUUID().slice(0, 8)}`,
        roomTypeId,
      },
    });

    roomId = room.id;

    const user = await prisma.user.create({
      data: {
        firstName: "Concurrency",
        lastName: "Tester",
        email: `concurrency-${randomUUID()}@example.com`,
        password: "test-password-hash",
      },
    });

    userId = user.id;

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 20);
    checkIn.setHours(14, 0, 0, 0);

    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const first = await prisma.reservation.create({
      data: {
        referenceId: generateReservationReferenceId(),
        checkIn,
        checkOut,
        guests: 2,
        totalAmount: 200,
        roomId,
        userId,
        status: "CONFIRMED",
      },
    });

    firstReservationId = first.id;
  });

  afterAll(async () => {
    if (roomId) {
      await prisma.reservation.deleteMany({ where: { roomId } });
      await prisma.room.deleteMany({ where: { id: roomId } });
    }

    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    if (roomTypeId) {
      await prisma.roomType.deleteMany({ where: { id: roomTypeId } });
    }

    await prisma.$disconnect();
  });

  it("rejects a second overlapping active reservation at the database level", async () => {
    const first = await prisma.reservation.findUniqueOrThrow({
      where: { id: firstReservationId },
    });

    let caughtError: unknown;

    try {
      await prisma.reservation.create({
        data: {
          referenceId: generateReservationReferenceId(),
          checkIn: new Date(first.checkIn.getTime() + 24 * 60 * 60 * 1000),
          checkOut: new Date(first.checkOut.getTime() + 24 * 60 * 60 * 1000),
          guests: 2,
          totalAmount: 200,
          roomId,
          userId,
          status: "CONFIRMED",
        },
      });
    } catch (error) {
      caughtError = error;

      console.dir(error, { depth: 8 });
    }

    expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    expect((caughtError as Prisma.PrismaClientKnownRequestError).code).toBe(
      "P2039",
    );
  });
});
