import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";
import { prisma } from "../lib/prisma.js";
import {
  createReservationRequest,
  reviewReservationRequest,
} from "../services/reservationRequests.js";

export const getReservationRequests = asyncHandler(
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
    if (
      req.user.role === "GUEST" &&
      reservation.userId !== req.user.userId
    ) {
      throw new AppError("Access denied", 403);
    }

    const requests = await prisma.reservationRequest.findMany({
      where: { reservationId },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    res.json(requests);
  },
);

export const submitReservationRequest = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== "GUEST") {
      throw new AppError("Guest access required", 403);
    }
    const reservationId = getStringParam(req.params.id, "reservation ID");
    const { type, reason, proposedChanges } = req.body;
    const request = await createReservationRequest({
      reservationId,
      guestId: req.user.userId,
      type,
      reason,
      ...(proposedChanges ? { proposedChanges } : {}),
    });
    res.status(201).json(request);
  },
);

export const reviewReservationRequestController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user || req.user.role !== "ADMIN") {
      throw new AppError("Administrator access required", 403);
    }
    const requestId = getStringParam(req.params.requestId, "request ID");
    const { decision, reviewReason } = req.body;
    const request = await reviewReservationRequest({
      requestId,
      adminId: req.user.userId,
      decision,
      reviewReason,
    });
    res.json(request);
  },
);
