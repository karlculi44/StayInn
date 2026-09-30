import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const [
      totalUsers,
      totalRooms,
      availableRooms,
      totalReservations,
      pendingReservations,
      confirmedReservations,
      completedReservations,
      cancelledReservations,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.room.count(),

      prisma.room.count({
        where: {
          status: "AVAILABLE",
        },
      }),

      prisma.reservation.count(),

      prisma.reservation.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.reservation.count({
        where: {
          status: "CONFIRMED",
        },
      }),

      prisma.reservation.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.reservation.count({
        where: {
          status: "CANCELLED",
        },
      }),
    ]);

    res.json({
      totalUsers,
      totalRooms,
      availableRooms,
      totalReservations,
      pendingReservations,
      confirmedReservations,
      completedReservations,
      cancelledReservations,
    });
  },
);
