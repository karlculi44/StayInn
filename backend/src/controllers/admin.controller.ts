import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
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

// Whitelisted SQL fragments only; never built from user input.
const TREND_RANGES = {
  "12m": {
    unit: "month",
    step: "1 month",
    start: "date_trunc('month', now_utc) - INTERVAL '11 months'",
    end: "date_trunc('month', now_utc)",
    format: "YYYY-MM",
  },
  "3m": {
    unit: "week",
    step: "1 week",
    start: "date_trunc('week', now_utc) - INTERVAL '12 weeks'",
    end: "date_trunc('week', now_utc)",
    format: "YYYY-MM-DD",
  },
  "30d": {
    unit: "day",
    step: "1 day",
    start: "date_trunc('day', now_utc) - INTERVAL '29 days'",
    end: "date_trunc('day', now_utc)",
    format: "YYYY-MM-DD",
  },
  "3w": {
    unit: "day",
    step: "1 day",
    start: "date_trunc('day', now_utc) - INTERVAL '20 days'",
    end: "date_trunc('day', now_utc)",
    format: "YYYY-MM-DD",
  },
  week: {
    unit: "day",
    step: "1 day",
    start: "date_trunc('week', now_utc)",
    end: "date_trunc('week', now_utc) + INTERVAL '6 days'",
    format: "YYYY-MM-DD",
  },
  "7d": {
    unit: "day",
    step: "1 day",
    start: "date_trunc('day', now_utc) - INTERVAL '6 days'",
    end: "date_trunc('day', now_utc)",
    format: "YYYY-MM-DD",
  },
  "3d": {
    unit: "day",
    step: "1 day",
    start: "date_trunc('day', now_utc) - INTERVAL '2 days'",
    end: "date_trunc('day', now_utc)",
    format: "YYYY-MM-DD",
  },
  today: {
    unit: "hour",
    step: "1 hour",
    start: "date_trunc('day', now_utc)",
    end: "date_trunc('day', now_utc) + INTERVAL '23 hours'",
    format: 'YYYY-MM-DD"T"HH24:00',
  },
} as const;

type TrendRange = keyof typeof TREND_RANGES;

export const getMonthlyBookingTrends = asyncHandler(
  async (req: Request, res: Response) => {
    const rangeParam = typeof req.query.range === "string" ? req.query.range : "12m";

    if (!Object.hasOwn(TREND_RANGES, rangeParam)) {
      res.status(400).json({ message: "Invalid range" });
      return;
    }

    const config = TREND_RANGES[rangeParam as TrendRange];

    const monthlyTrends = await prisma.$queryRaw<
      { month: string; reservationCount: number }[]
    >(Prisma.sql`
      WITH bounds AS (
        SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS now_utc
      ),
      bucket_range AS (
        SELECT generate_series(
          ${Prisma.raw(config.start)},
          ${Prisma.raw(config.end)},
          INTERVAL '${Prisma.raw(config.step)}'
        ) AS bucket_start
        FROM bounds
      )
      SELECT
        to_char(bucket_range.bucket_start, '${Prisma.raw(config.format)}') AS month,
        COUNT(reservation.id)::int AS "reservationCount"
      FROM bucket_range
      LEFT JOIN "Reservation" AS reservation
        ON reservation."createdAt" >= bucket_range.bucket_start
        AND reservation."createdAt" < bucket_range.bucket_start + INTERVAL '${Prisma.raw(config.step)}'
      GROUP BY bucket_range.bucket_start
      ORDER BY bucket_range.bucket_start
    `);

    res.json(monthlyTrends);
  },
);
