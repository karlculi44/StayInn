import { Prisma } from "@prisma/client";
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

type UpdateReservationInput = CreateReservationInput;

const lockRoomsInOrder = async (
  tx: Prisma.TransactionClient,
  roomIds: string[],
) => {
  const orderedRoomIds = [...new Set(roomIds)].sort();

  return tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT "id"
      FROM "Room"
      WHERE "id" IN (${Prisma.join(orderedRoomIds)})
      ORDER BY "id"
      FOR UPDATE
    `,
  );
};

const getRoomForBooking = async (
  tx: Prisma.TransactionClient,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  guests: number,
  excludeReservationId?: string,
) => {
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
      ...(excludeReservationId && {
        id: { not: excludeReservationId },
      }),
    },
  });

  if (overlappingReservation) {
    throw new AppError("Room is already booked for the selected dates", 409);
  }

  return room;
};

const calculateTotalAmount = (
  pricePerNight: Prisma.Decimal,
  checkIn: Date,
  checkOut: Date,
) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay,
  );

  return Number(pricePerNight) * nights;
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

      const lockedRooms = await lockRoomsInOrder(tx, [roomId]);

      if (lockedRooms.length === 0) {
        throw new AppError("Room not found", 404);
      }

      const room = await getRoomForBooking(
        tx,
        roomId,
        checkIn,
        checkOut,
        guests,
      );
      const totalAmount = calculateTotalAmount(
        room.roomType.pricePerNight,
        checkIn,
        checkOut,
      );

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

export const updateReservationForAdmin = async (
  id: string,
  {
    userId,
    roomId,
    checkIn,
    checkOut,
    guests,
  }: UpdateReservationInput,
) =>
  prisma.$transaction(async (tx) => {
    const lockedReservations = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "Reservation"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    if (lockedReservations.length === 0) {
      throw new AppError("Reservation not found", 404);
    }

    const reservation = await tx.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
      throw new AppError(
        "Only pending or confirmed reservations can be edited",
        400,
      );
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const lockedRooms = await lockRoomsInOrder(tx, [reservation.roomId, roomId]);

    if (!lockedRooms.some((room) => room.id === roomId)) {
      throw new AppError("Room not found", 404);
    }

    const room = await getRoomForBooking(
      tx,
      roomId,
      checkIn,
      checkOut,
      guests,
      reservation.id,
    );
    const totalAmount = calculateTotalAmount(
      room.roomType.pricePerNight,
      checkIn,
      checkOut,
    );

    return tx.reservation.update({
      where: { id },
      data: {
        userId,
        roomId,
        checkIn,
        checkOut,
        guests,
        totalAmount,
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
  });
