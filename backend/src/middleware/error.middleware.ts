import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2039"
  ) {
    const meta = err.meta as
      | {
          driverAdapterError?: {
            cause?: {
              code?: string;
              message?: string;
            };
          };
        }
      | undefined;

    const cause = meta?.driverAdapterError?.cause;

    if (
      cause?.code === "23P01" &&
      cause.message?.includes("Reservation_no_overlapping_active_bookings")
    ) {
      return res.status(409).json({
        message: "Room is already booked for the selected dates",
      });
    }
  }

  return res.status(500).json({ message: "Internal server error" });
};
