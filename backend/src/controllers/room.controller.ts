import type { NextFunction, Request, Response } from "express";
import type { AvailabilityQuery } from "../schemas/room.schema.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({
    where: {
      status: "AVAILABLE",
    },
    include: {
      roomType: true,
    },
  });

  res.json(rooms);
});

export const getAllRoomsForAdmin = asyncHandler(
  async (_req: Request, res: Response) => {
    const rooms = await prisma.room.findMany({
      include: {
        roomType: true,
      },
    });

    res.json(rooms);
  },
);

export const getRoomById = asyncHandler(async (req: Request, res: Response) => {
  const id = getStringParam(req.params.id, "room ID");

  const room = await prisma.room.findFirst({
    where: {
      id,
      status: "AVAILABLE",
    },
    include: {
      roomType: true,
    },
  });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  res.json(room);
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { roomNumber, roomTypeId } = req.body;

  const roomType = await prisma.roomType.findUnique({
    where: {
      id: roomTypeId,
    },
  });

  if (!roomType) {
    throw new AppError("Room type not found", 404);
  }

  const existingRoom = await prisma.room.findUnique({
    where: {
      roomNumber,
    },
  });

  if (existingRoom) {
    throw new AppError("Room number already exists", 409);
  }

  const room = await prisma.room.create({
    data: {
      roomNumber,
      roomTypeId,
    },
    include: {
      roomType: true,
    },
  });

  res.status(201).json(room);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const id = getStringParam(req.params.id, "room ID");

  const { roomNumber, roomTypeId } = req.body;

  const room = await prisma.room.findUnique({
    where: { id },
  });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  if (roomTypeId) {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      throw new AppError("Room type not found", 404);
    }
  }

  if (roomNumber) {
    const existingRoom = await prisma.room.findUnique({
      where: { roomNumber },
    });

    if (existingRoom && existingRoom.id !== id) {
      throw new AppError("Room number already exists", 409);
    }
  }

  const updatedRoom = await prisma.room.update({
    where: { id },
    data: {
      roomNumber,
      roomTypeId,
    },
    include: {
      roomType: true,
    },
  });

  res.json(updatedRoom);
});

export const updateRoomStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "room ID");
    const { status, reason } = req.body;
    const adminId = req.user?.userId;

    if (!adminId) {
      throw new AppError("Authentication required", 401);
    }

    const updatedRoom = await prisma.$transaction(async (tx) => {
      // Lock the room so booking creation and status changes
      // can coordinate on the same database row.
      const lockedRooms = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Room"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (lockedRooms.length === 0) {
        throw new AppError("Room not found", 404);
      }

      const room = await tx.room.findUnique({
        where: { id },
      });

      if (!room) {
        throw new AppError("Room not found", 404);
      }

      // A no-op should not require a reason or create history.
      if (room.status === status) {
        return tx.room.findUniqueOrThrow({
          where: { id },
          include: { roomType: true },
        });
      }

      if (status !== "AVAILABLE" && !reason) {
        throw new AppError("A reason is required for this room status", 400);
      }

      if (status !== "AVAILABLE") {
        const conflictingReservation = await tx.reservation.findFirst({
          where: {
            roomId: id,
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
            checkOut: {
              gt: new Date(),
            },
          },
          select: {
            id: true,
          },
        });

        if (conflictingReservation) {
          throw new AppError(
            "This room has an active or upcoming reservation and cannot be marked unavailable",
            409,
          );
        }
      }

      const updated = await tx.room.update({
        where: { id },
        data: { status },
        include: { roomType: true },
      });

      await tx.roomStatusHistory.create({
        data: {
          roomId: id,
          adminId,
          previousStatus: room.status,
          newStatus: status,
          reason: reason ?? "Room restored to available status",
        },
      });

      return updated;
    });

    res.json(updatedRoom);
  },
);

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const id = getStringParam(req.params.id, "room ID");

  const room = await prisma.room.findUnique({
    where: { id },
  });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  await prisma.room.delete({
    where: { id },
  });

  res.status(204).send();
});

export const getAvailableRooms = async (req: Request, res: Response) => {
  const { checkIn, checkOut } = req.validated as AvailabilityQuery;

  const rooms = await prisma.room.findMany({
    where: {
      status: "AVAILABLE",
      reservations: {
        none: {
          status: {
            not: "CANCELLED",
          },
          checkIn: {
            lt: new Date(checkOut),
          },
          checkOut: {
            gt: new Date(checkIn),
          },
        },
      },
    },
    include: {
      roomType: true,
    },
  });

  res.json(rooms);
};
