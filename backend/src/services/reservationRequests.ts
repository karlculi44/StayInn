import { Prisma } from "@prisma/client";
import type {
  ReservationRequestStatus,
  ReservationRequestType,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { createNotification } from "./notificationCreation.js";
import {
  calculateTotalAmount,
  getRoomForBooking,
  lockRoomsInOrder,
} from "./reservationCreation.js";

type ProposedChanges = {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
};

type CreateRequestInput = {
  reservationId: string;
  guestId: string;
  type: ReservationRequestType;
  reason: string;
  proposedChanges?: ProposedChanges;
};

const getSnapshot = (reservation: {
  status: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalAmount: Prisma.Decimal;
}) => ({
  status: reservation.status,
  roomId: reservation.roomId,
  checkIn: reservation.checkIn.toISOString(),
  checkOut: reservation.checkOut.toISOString(),
  guests: reservation.guests,
  totalAmount: reservation.totalAmount.toString(),
});

const snapshotsMatch = (current: ReturnType<typeof getSnapshot>, original: unknown) =>
  original !== null &&
  typeof original === "object" &&
  !Array.isArray(original) &&
  Object.keys(current).every(
    (key) =>
      (original as Record<string, unknown>)[key] ===
      current[key as keyof typeof current],
  );

const parseProposedChanges = (value: Prisma.JsonValue | null): ProposedChanges => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.roomId !== "string" ||
    typeof value.checkIn !== "string" ||
    typeof value.checkOut !== "string" ||
    typeof value.guests !== "number"
  ) {
    throw new AppError("This edit request has invalid proposed changes", 400);
  }

  const checkIn = new Date(value.checkIn);
  const checkOut = new Date(value.checkOut);
  if (
    Number.isNaN(checkIn.getTime()) ||
    Number.isNaN(checkOut.getTime()) ||
    checkOut <= checkIn
  ) {
    throw new AppError("This edit request has invalid proposed dates", 400);
  }

  return {
    roomId: value.roomId,
    checkIn,
    checkOut,
    guests: value.guests,
  };
};

export const createReservationRequest = async (input: CreateRequestInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Reservation"
        WHERE "id" = ${input.reservationId}
        FOR UPDATE
      `;
      if (!locked.length) {
        throw new AppError("Reservation not found", 404);
      }

      const reservation = await tx.reservation.findUnique({
        where: { id: input.reservationId },
        include: {
          room: { include: { roomType: true } },
          user: { select: { id: true } },
        },
      });
      if (!reservation || reservation.userId !== input.guestId) {
        throw new AppError("Reservation not found", 404);
      }
      if (reservation.status !== "CONFIRMED") {
        throw new AppError(
          "Requests are only available for confirmed reservations",
          400,
        );
      }

      const existingRequest = await tx.reservationRequest.findFirst({
        where: { reservationId: input.reservationId, status: "PENDING" },
        select: { id: true },
      });
      if (existingRequest) {
        throw new AppError("A request is already pending for this reservation", 409);
      }

      const request = await tx.reservationRequest.create({
        data: {
          reservationId: reservation.id,
          guestId: input.guestId,
          type: input.type,
          reason: input.reason,
          originalValues: getSnapshot(reservation),
          ...(input.proposedChanges
            ? {
                proposedChanges: {
                  roomId: input.proposedChanges.roomId,
                  checkIn: input.proposedChanges.checkIn.toISOString(),
                  checkOut: input.proposedChanges.checkOut.toISOString(),
                  guests: input.proposedChanges.guests,
                },
              }
            : {}),
        },
      });

      const action =
        input.type === "EDIT" ? "EDIT_REQUESTED" : "CANCELLATION_REQUESTED";
      const label = input.type === "EDIT" ? "edit" : "cancellation";
      await tx.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          actorId: input.guestId,
          action,
          description: `A reservation ${label} request was submitted. Reason: ${input.reason}`,
          oldValues: getSnapshot(reservation),
          newValues: {
            requestId: request.id,
            status: "PENDING",
            ...(input.proposedChanges
              ? {
                  checkIn: input.proposedChanges.checkIn.toISOString(),
                  checkOut: input.proposedChanges.checkOut.toISOString(),
                  guests: input.proposedChanges.guests,
                  roomId: input.proposedChanges.roomId,
                }
              : {}),
          },
          visibility: "GUEST_VISIBLE",
        },
      });

      const admins = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "User"
        WHERE "role" = 'ADMIN'
        ORDER BY "id"
        FOR SHARE
      `;
      await createNotification(tx, {
        type: "RESERVATION_REQUEST_SUBMITTED",
        title: input.type === "EDIT" ? "New Edit Request" : "Cancellation Request",
        message: `A guest has requested ${label} of reservation #${reservation.referenceId}.`,
        referenceId: reservation.id,
        referenceType: "RESERVATION",
        recipientIds: admins.map(({ id }) => id),
      });

      return request;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("A request is already pending for this reservation", 409);
    }
    throw error;
  }
};

export const reviewReservationRequest = async (input: {
  requestId: string;
  adminId: string;
  decision: ReservationRequestStatus;
  reviewReason: string;
}) =>
  prisma.$transaction(async (tx) => {
    const requestInfo = await tx.reservationRequest.findUnique({
      where: { id: input.requestId },
      select: { reservationId: true },
    });
    if (!requestInfo) {
      throw new AppError("Reservation request not found", 404);
    }

    const lockedReservation = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Reservation"
      WHERE "id" = ${requestInfo.reservationId}
      FOR UPDATE
    `;
    if (!lockedReservation.length) {
      throw new AppError("Reservation not found", 404);
    }
    const lockedRequest = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ReservationRequest"
      WHERE "id" = ${input.requestId}
      FOR UPDATE
    `;
    if (!lockedRequest.length) {
      throw new AppError("Reservation request not found", 404);
    }

    const request = await tx.reservationRequest.findUnique({
      where: { id: input.requestId },
    });
    const reservation = await tx.reservation.findUnique({
      where: { id: requestInfo.reservationId },
      include: { room: { include: { roomType: true } } },
    });
    if (!request || !reservation) {
      throw new AppError("Reservation request not found", 404);
    }
    if (request.status !== "PENDING") {
      throw new AppError("This request has already been reviewed", 409);
    }

    let updatedReservation = reservation;
    if (input.decision === "APPROVED") {
      if (request.type === "EDIT") {
        if (reservation.status !== "CONFIRMED") {
          throw new AppError(
            "The reservation is no longer eligible for editing",
            409,
          );
        }
        const currentValues = getSnapshot(reservation);
        if (!snapshotsMatch(currentValues, request.originalValues)) {
          throw new AppError(
            "The reservation changed after this request was submitted. Ask the guest to submit a new request.",
            409,
          );
        }

        const changes = parseProposedChanges(request.proposedChanges);
        const lockedRooms = await lockRoomsInOrder(tx, [
          reservation.roomId,
          changes.roomId,
        ]);
        if (!lockedRooms.some(({ id }) => id === changes.roomId)) {
          throw new AppError("Room not found", 404);
        }
        const room = await getRoomForBooking(
          tx,
          changes.roomId,
          changes.checkIn,
          changes.checkOut,
          changes.guests,
          reservation.id,
        );
        const totalAmount = calculateTotalAmount(
          room.roomType.pricePerNight,
          changes.checkIn,
          changes.checkOut,
        );
        updatedReservation = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            roomId: changes.roomId,
            checkIn: changes.checkIn,
            checkOut: changes.checkOut,
            guests: changes.guests,
            totalAmount,
          },
          include: { room: { include: { roomType: true } } },
        });
      } else {
        if (reservation.status !== "CONFIRMED") {
          throw new AppError(
            "The reservation is no longer eligible for cancellation",
            409,
          );
        }
        updatedReservation = await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "CANCELLED" },
          include: { room: { include: { roomType: true } } },
        });
      }
    }

    const reviewedAt = new Date();
    const reviewedRequest = await tx.reservationRequest.update({
      where: { id: request.id },
      data: {
        status: input.decision,
        reviewedBy: input.adminId,
        reviewReason: input.reviewReason,
        reviewedAt,
      },
    });
    const action =
      request.type === "EDIT"
        ? input.decision === "APPROVED"
          ? "EDIT_APPROVED"
          : "EDIT_REJECTED"
        : input.decision === "APPROVED"
          ? "CANCELLATION_APPROVED"
          : "CANCELLATION_REJECTED";
    const requestLabel = request.type === "EDIT" ? "edit" : "cancellation";
    await tx.reservationHistory.create({
      data: {
        reservationId: reservation.id,
        actorId: input.adminId,
        action,
        description: `The ${requestLabel} request was ${input.decision.toLowerCase()}. Review reason: ${input.reviewReason}`,
        oldValues: getSnapshot(reservation),
        newValues: {
          requestId: request.id,
          requestStatus: input.decision,
          status: updatedReservation.status,
          checkIn: updatedReservation.checkIn.toISOString(),
          checkOut: updatedReservation.checkOut.toISOString(),
          guests: updatedReservation.guests,
          roomId: updatedReservation.roomId,
          totalAmount: updatedReservation.totalAmount.toString(),
          reviewReason: input.reviewReason,
        },
        visibility: "GUEST_VISIBLE",
      },
    });

    if (request.guestId) {
      await createNotification(tx, {
        type: "RESERVATION_REQUEST_REVIEWED",
        title:
          input.decision === "APPROVED"
            ? `${requestLabel === "edit" ? "Edit" : "Cancellation"} request approved`
            : `${requestLabel === "edit" ? "Edit" : "Cancellation"} request rejected`,
        message: `Your ${requestLabel} request for reservation ${reservation.referenceId} was ${input.decision.toLowerCase()}. ${input.reviewReason}`,
        referenceId: reservation.id,
        referenceType: "RESERVATION",
        recipientIds: [request.guestId],
      });
    }

    return reviewedRequest;
  });
