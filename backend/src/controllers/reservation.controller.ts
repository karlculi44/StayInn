import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import type { ReservationStatus } from "@prisma/client";
import type { AdminReservationQuery } from "../schemas/reservation.schema.js";

const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

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

export const getReservations = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const userId = req.user.userId;

    const reservations = await prisma.reservation.findMany({
      where: {
        userId,
      },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
      },
      orderBy: {
        checkIn: "desc",
      },
    });

    res.json(reservations);
  },
);

export const getReservationById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "reservation ID");

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
      },
      include: {
        room: {
          include: {
            roomType: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    if (reservation.userId !== req.user.userId) {
      throw new AppError("Access denied", 403);
    }

    res.json(reservation);
  },
);

export const cancelReservation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "reservation ID");

    const reservation = await prisma.reservation.findUnique({
      where: {
        id,
      },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    if (reservation.userId !== req.user.userId) {
      throw new AppError("Access denied", 403);
    }

    if (reservation.status === "CANCELLED") {
      throw new AppError("Reservation is already cancelled", 400);
    }

    if (reservation.status === "COMPLETED") {
      throw new AppError("Completed reservations cannot be cancelled", 400);
    }

    const cancelledReservation = await prisma.reservation.update({
      where: {
        id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    res.json(cancelledReservation);
  },
);

export const getAllReservations = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = req.validated as AdminReservationQuery;

    const reservations = await prisma.reservation.findMany({
      where: status ? { status } : {},
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
      orderBy: {
        checkIn: "desc",
      },
    });
    res.json(reservations);
  },
);

export const updateReservationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "reservation ID");
    const { status } = req.body;

    const reservation = await prisma.reservation.findUnique({
      where: {
        id,
      },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    const allowedStatuses = validTransitions[reservation.status];

    if (!allowedStatuses.includes(status)) {
      throw new AppError(
        `Invalid status transition from ${reservation.status} to ${status}`,
        400,
      );
    }

    const updatedReservation = await prisma.reservation.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    res.json(updatedReservation);
  },
);
