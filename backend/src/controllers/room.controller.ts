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

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
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

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

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
