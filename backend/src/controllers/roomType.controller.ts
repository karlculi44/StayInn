import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { getStringParam } from "../utils/getParam.js";

export const getRoomTypes = asyncHandler(
  async (req: Request, res: Response) => {
    const roomTypes = await prisma.roomType.findMany({
      include: { rooms: true },
    });
    res.json(roomTypes);
  },
);

export const getRoomTypeById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "room type ID");

    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: { rooms: true },
    });
    if (!roomType) {
      throw new AppError("Room type not found", 404);
    }
    res.json(roomType);
  },
);

export const createRoomType = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description, capacity, pricePerNight } = req.body;

    const exisitingRoomType = await prisma.roomType.findUnique({
      where: { name },
    });

    if (exisitingRoomType) {
      throw new AppError("Room type already exists", 409);
    }

    const roomType = await prisma.roomType.create({
      data: {
        name,
        description,
        capacity,
        pricePerNight,
      },
    });
    res.status(201).json(roomType);
  },
);
export const updateRoomType = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "room type ID");

    const { name, description, capacity, pricePerNight } = req.body;

    const roomType = await prisma.roomType.findUnique({
      where: {
        id,
      },
    });

    if (!roomType) {
      throw new AppError("Room type not found", 404);
    }

    if (name) {
      const existingRoomType = await prisma.roomType.findFirst({
        where: {
          name,
          NOT: {
            id,
          },
        },
      });

      if (existingRoomType) {
        throw new AppError("Room type already exists", 409);
      }
    }

    const updatedRoomType = await prisma.roomType.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        capacity,
        pricePerNight,
      },
    });

    res.json(updatedRoomType);
  },
);

export const deleteRoomType = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "room type ID");

    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: { rooms: true },
    });

    if (!roomType) {
      throw new AppError("Room type not found", 404);
    }

    if (roomType.rooms.length > 0) {
      throw new AppError("Cannot delete room type with associated rooms", 409);
    }

    await prisma.roomType.delete({
      where: { id },
    });

    res.status(204).send();
  },
);
