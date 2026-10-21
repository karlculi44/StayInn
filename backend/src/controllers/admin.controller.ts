import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const getRoomStatusHistory = asyncHandler(
  async (_req: Request, res: Response) => {
    const history = await prisma.roomStatusHistory.findMany({
      select: {
        id: true,
        previousStatus: true,
        newStatus: true,
        reason: true,
        createdAt: true,
        room: {
          select: {
            id: true,
            roomNumber: true,
          },
        },
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(history);
  },
);

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

export const getMonthlyBookingTrends = asyncHandler(
  async (_req: Request, res: Response) => {
    const monthlyTrends = await prisma.$queryRaw<
      { month: string; reservationCount: number }[]
    >`
      WITH month_range AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '11 months',
          date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        to_char(month_range.month_start, 'YYYY-MM') AS month,
        COUNT(reservation.id)::int AS "reservationCount"
      FROM month_range
      LEFT JOIN "Reservation" AS reservation
        ON reservation."createdAt" >= month_range.month_start
        AND reservation."createdAt" < month_range.month_start + INTERVAL '1 month'
      GROUP BY month_range.month_start
      ORDER BY month_range.month_start
    `;

    res.json(monthlyTrends);
  },
);
