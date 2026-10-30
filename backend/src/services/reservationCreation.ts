import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { createWithReservationReference } from "../utils/reservationReference.js";
import { createNotification } from "./notificationCreation.js";

type CreateReservationInput = {
  userId: string;
  actorId: string;
  notifyAdmins?: boolean;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
};

type UpdateReservationInput = Omit<CreateReservationInput, "actorId">;
type ReservationHistoryJson = {
  [key: string]: Prisma.InputJsonValue | null;
};

const getReservationValues = (reservation: {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalAmount: Prisma.Decimal;
  room: { roomNumber: string; roomType: { name: string } };
}) => ({
  checkIn: reservation.checkIn.toISOString(),
  checkOut: reservation.checkOut.toISOString(),
  guests: reservation.guests,
  room: `Room ${reservation.room.roomNumber} · ${reservation.room.roomType.name}`,
  totalAmount: reservation.totalAmount.toString(),
});

const createUpdatedHistory = async (
  tx: Prisma.TransactionClient,
  input: {
    reservationId: string;
    actorId: string;
    oldValues: ReservationHistoryJson;
    newValues: ReservationHistoryJson;
    guestChanged?: boolean;
  },
) => {
  const oldValues: ReservationHistoryJson = {};
  const newValues: ReservationHistoryJson = {};
  const keys = new Set([
    ...Object.keys(input.oldValues),
    ...Object.keys(input.newValues),
  ]);

  for (const key of keys) {
    const previousValue = input.oldValues[key] ?? null;
    const nextValue = input.newValues[key] ?? null;
    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      oldValues[key] = previousValue;
      newValues[key] = nextValue;
    }
  }

  if (input.guestChanged) {
    oldValues.guestChanged = false;
    newValues.guestChanged = true;
  }

  if (Object.keys(newValues).length === 0) {
    return false;
  }

  await tx.reservationHistory.create({
    data: {
      reservationId: input.reservationId,
      actorId: input.actorId,
      action: "UPDATED",
      description: "Reservation details have been updated.",
      oldValues,
      newValues,
      visibility: "GUEST_VISIBLE",
    },
  });

  return true;
};

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
  actorId,
  notifyAdmins = false,
  roomId,
  checkIn,
  checkOut,
  guests,
}: CreateReservationInput) =>
  createWithReservationReference((referenceId) =>
    prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (user.role !== "GUEST") {
        throw new AppError("Reservations can only be created for guests", 400);
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

      const reservation = await tx.reservation.create({
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

      await tx.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          actorId,
          action: "CREATED",
          description:
            actorId === userId
              ? "Your reservation has been successfully received."
              : "A reservation has been created for you.",
          newValues: {
            status: reservation.status,
            checkIn: reservation.checkIn.toISOString(),
            checkOut: reservation.checkOut.toISOString(),
            guests: reservation.guests,
            room: `Room ${room.roomNumber} · ${room.roomType.name}`,
            totalAmount: reservation.totalAmount.toString(),
          },
          visibility: "GUEST_VISIBLE",
        },
      });

      if (notifyAdmins) {
        const admins = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "User"
          WHERE "role" = 'ADMIN'
          ORDER BY "id"
          FOR SHARE
        `;
        const guestName = reservation.user
          ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
          : "A guest";

        await createNotification(tx, {
          type: "NEW_RESERVATION",
          title: "New Reservation Received",
          message: `${guestName} has submitted a new reservation.`,
          referenceId: reservation.id,
          referenceType: "RESERVATION",
          recipientIds: admins.map(({ id }) => id),
        });
      }

      return reservation;
    }),
  );

export const updateReservationForAdmin = async (
  id: string,
  actorId: string,
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
      include: { room: { include: { roomType: true } } },
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

    const oldValues = getReservationValues(reservation);
    const nextValues = getReservationValues({
      checkIn,
      checkOut,
      guests,
      totalAmount: new Prisma.Decimal(totalAmount),
      room,
    });
    const guestChanged = reservation.userId !== userId;
    const changed = await createUpdatedHistory(tx, {
      reservationId: id,
      actorId,
      oldValues,
      newValues: nextValues,
      guestChanged,
    });

    if (!changed) {
      return tx.reservation.findUniqueOrThrow({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          room: { include: { roomType: true } },
        },
      });
    }

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

export const updateReservationForGuest = async (
  id: string,
  userId: string,
  actorId: string,
  {
    roomId,
    checkIn,
    checkOut,
    guests,
  }: Omit<CreateReservationInput, "userId" | "actorId">,
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
      include: { room: { include: { roomType: true } } },
    });

    if (!reservation || reservation.userId !== userId) {
      throw new AppError("Reservation not found", 404);
    }

    if (reservation.status !== "PENDING") {
      throw new AppError("Only pending reservations can be edited", 400);
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

    const oldValues = getReservationValues(reservation);
    const nextValues = getReservationValues({
      checkIn,
      checkOut,
      guests,
      totalAmount: new Prisma.Decimal(totalAmount),
      room,
    });
    const changed = await createUpdatedHistory(tx, {
      reservationId: id,
      actorId,
      oldValues,
      newValues: nextValues,
    });

    if (!changed) {
      return tx.reservation.findUniqueOrThrow({
        where: { id },
        include: {
          room: { include: { roomType: true } },
        },
      });
    }

    return tx.reservation.update({
      where: { id },
      data: {
        roomId,
        checkIn,
        checkOut,
        guests,
        totalAmount,
      },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
      },
    });
  });
