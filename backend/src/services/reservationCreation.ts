import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { createWithReservationReference } from "../utils/reservationReference.js";

type CreateReservationInput = {
  userId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
};

export const createReservationForUser = async ({
  userId,
  roomId,
  checkIn,
  checkOut,
  guests,
}: CreateReservationInput) =>
  createWithReservationReference((referenceId) =>
    prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const lockedRooms = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Room"
        WHERE "id" = ${roomId}
        FOR UPDATE
      `;

      if (lockedRooms.length === 0) {
        throw new AppError("Room not found", 404);
      }

      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { roomType: true },
      });

      if (!room) {
        throw new AppError("Room not found", 404);
      }

      if (room.status !== "AVAILABLE") {
        throw new AppError("Room is not available for booking", 409);
      }

      if (guests > room.roomType.capacity) {
        throw new AppError(
          `Number of guests exceeds room capacity of ${room.roomType.capacity}`,
          400,
        );
      }

      const overlappingReservation = await tx.reservation.findFirst({
        where: {
          roomId,
          status: { not: "CANCELLED" },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      });

      if (overlappingReservation) {
        throw new AppError(
          "Room is already booked for the selected dates",
          409,
        );
      }

      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay,
      );
      const totalAmount = Number(room.roomType.pricePerNight) * nights;

      return tx.reservation.create({
        data: {
          referenceId,
          checkIn,
          checkOut,
          guests,
          totalAmount,
          roomId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          room: {
            include: {
              roomType: true,
            },
          },
        },
      });
    }),
  );
