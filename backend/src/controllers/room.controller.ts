import type { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({
    include: {
      roomType: true,
    },
  });

  res.json(rooms);
});

export const getRoomById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await prisma.room.findUnique({
    where: { id },
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
