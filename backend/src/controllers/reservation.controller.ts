import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import type { ReservationStatus } from "@prisma/client";
import type { AdminReservationQuery } from "../schemas/reservation.schema.js";
import {
  createReservationForUser,
  updateReservationForAdmin,
  updateReservationForGuest,
} from "../services/reservationCreation.js";
import { createNotification } from "../services/notificationCreation.js";

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

    const reservation = await createReservationForUser({
      userId,
      actorId: userId,
      notifyAdmins: true,
      roomId,
      checkIn,
      checkOut,
      guests,
    });

    res.status(201).json(reservation);
  },
);

export const createAdminReservation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { userId, roomId, checkIn, checkOut, guests } = req.body;

    const reservation = await createReservationForUser({
      userId,
      actorId: req.user.userId,
      roomId,
      checkIn,
      checkOut,
      guests,
    });

    res.status(201).json(reservation);
  },
);

export const updateAdminReservation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "reservation ID");
    const { userId, roomId, checkIn, checkOut, guests } = req.body;

    const actorId = req.user.userId;
    const reservation = await updateReservationForAdmin(id, actorId, {
        userId,
        roomId,
        checkIn,
        checkOut,
        guests,
    });

    res.json(reservation);
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

export const getReservationHistory = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const reservationId = getStringParam(req.params.id, "reservation ID");
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, userId: true },
    });

    if (!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    if (req.user.role === "GUEST" && reservation.userId !== req.user.userId) {
      throw new AppError("Access denied", 403);
    }

    const history = await prisma.reservationHistory.findMany({
      where: {
        reservationId,
        ...(req.user.role === "GUEST"
          ? { visibility: "GUEST_VISIBLE" }
          : {}),
      },
      ...(req.user.role === "ADMIN"
        ? {
            include: {
              actor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          }
        : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    res.json(history);
  },
);

export const updateGuestReservation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "reservation ID");
    const { roomId, checkIn, checkOut, guests } = req.body;
    const actorId = req.user.userId;

    const reservation = await updateReservationForGuest(
      id,
      actorId,
      actorId,
      { roomId, checkIn, checkOut, guests },
    );

    res.json(reservation);
  },
);

export const cancelReservation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "reservation ID");
    const actorId = req.user.userId;

    const cancelledReservation = await prisma.$transaction(async (tx) => {
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

      if (reservation.userId !== actorId) {
        throw new AppError("Access denied", 403);
      }

      if (reservation.status === "CANCELLED") {
        throw new AppError("Reservation is already cancelled", 400);
      }

      if (reservation.status === "COMPLETED") {
        throw new AppError("Completed reservations cannot be cancelled", 400);
      }

      const updated = await tx.reservation.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await tx.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          actorId,
          action: "CANCELLED",
          description: "Your reservation has been cancelled.",
          oldValues: { status: reservation.status },
          newValues: { status: "CANCELLED" },
          visibility: "GUEST_VISIBLE",
        },
      });

      return updated;
    });

    res.json(cancelledReservation);
  },
);

export const getAllReservations = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, checkIn, checkOut } =
      req.validated as AdminReservationQuery;

    const where = {
      ...(status && { status }),
      ...(checkIn && {
        checkIn: {
          gte: checkIn,
        },
      }),
      ...(checkOut && {
        checkOut: {
          lte: checkOut,
        },
      }),
    };

    const reservations = await prisma.reservation.findMany({
      where,
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

export const getAdminReservationById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "reservation ID");
    const reservation = await prisma.reservation.findUnique({
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

    res.json(reservation);
  },
);

export const updateReservationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "reservation ID");
    const { status } = req.body;
    const actorId = req.user.userId;

    const updatedReservation = await prisma.$transaction(async (transaction) => {
      const lockedReservations = await transaction.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Reservation"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (lockedReservations.length === 0) {
        throw new AppError("Reservation not found", 404);
      }

      const reservation = await transaction.reservation.findUnique({
        where: { id },
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

      const updated = await transaction.reservation.update({
        where: { id },
        data: { status },
      });

      let action: "CONFIRMED" | "CANCELLED" | "COMPLETED";
      let description: string;
      switch (status) {
        case "CONFIRMED":
          action = "CONFIRMED";
          description = "Your reservation has been confirmed by StayInn.";
          break;
        case "CANCELLED":
          action = "CANCELLED";
          description = "Your reservation has been cancelled.";
          break;
        case "COMPLETED":
          action = "COMPLETED";
          description = "Your stay has been marked as completed.";
          break;
        default:
          throw new AppError("Invalid reservation status", 400);
      }

      await transaction.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          actorId,
          action,
          description,
          oldValues: { status: reservation.status },
          newValues: { status },
          visibility: "GUEST_VISIBLE",
        },
      });

      if (reservation.userId) {
        await createNotification(transaction, {
          type: "RESERVATION_STATUS_UPDATED",
          title: "Reservation status updated",
          message: `Your reservation ${reservation.referenceId} is now ${status.toLowerCase()}.`,
          referenceId: reservation.id,
          referenceType: "RESERVATION",
          recipientIds: [reservation.userId],
        });
      }

      return updated;
    });

    res.json(updatedReservation);
  },
);
