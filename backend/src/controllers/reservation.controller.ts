import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";

export const createReservation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const userId = req.user.userId;

    const { checkIn, checkOut, guests, roomId } = req.body;

    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
      },
      include: {
        roomType: true,
      },
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

    const overlappingReservation = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: {
          not: "CANCELLED",
        },
        checkIn: {
          lt: checkOut,
        },
        checkOut: {
          gt: checkIn,
        },
      },
    });

    if (overlappingReservation) {
      throw new AppError("Room is already booked for the selected dates", 409);
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay,
    );

    const totalAmount = Number(room.roomType.pricePerNight) * nights;

    const reservation = await prisma.reservation.create({
      data: {
        checkIn,
        checkOut,
        guests,
        totalAmount,
        roomId,
        userId,
      },
    });

    res.status(201).json(reservation);
  },
);
