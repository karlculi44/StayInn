import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { getStringParam } from "../utils/getParam.js";
import {
  getRoomTypeImageKey,
  getRoomTypeImageUrl,
  readRoomTypeImage,
  removeRoomTypeImage,
  storeRoomTypeImage,
} from "../services/roomTypeImage.js";

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

export const getRoomTypeImage = asyncHandler(
  async (req: Request, res: Response) => {
    const key = getStringParam(req.params.key, "image key");
    const { image, contentType } = await readRoomTypeImage(key);

    res
      .status(200)
      .type(contentType)
      .set("Cache-Control", "public, max-age=31536000, immutable")
      .set("Cross-Origin-Resource-Policy", "cross-origin")
      .set("X-Content-Type-Options", "nosniff")
      .send(image);
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

    const storedImage = req.file
      ? await storeRoomTypeImage(req.file.buffer, req.file.mimetype)
      : null;

    try {
      const roomType = await prisma.roomType.create({
        data: {
          name,
          description,
          capacity,
          pricePerNight,
          ...(storedImage ? { image: storedImage.imageUrl } : {}),
        },
      });
      res.status(201).json(roomType);
    } catch (error: unknown) {
      if (storedImage) {
        try {
          await removeRoomTypeImage(storedImage.imageUrl);
        } catch (cleanupError: unknown) {
          console.error("Unable to clean up failed room type image:", cleanupError);
        }
      }
      throw error;
    }
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

    const storedImage = req.file
      ? await storeRoomTypeImage(req.file.buffer, req.file.mimetype)
      : null;

    let updatedRoomType;
    try {
      updatedRoomType = await prisma.roomType.update({
        where: {
          id,
        },
        data: {
          name,
          description,
          capacity,
          pricePerNight,
          ...(storedImage ? { image: storedImage.imageUrl } : {}),
        },
      });
    } catch (error: unknown) {
      if (storedImage) {
        try {
          await removeRoomTypeImage(storedImage.imageUrl);
        } catch (cleanupError: unknown) {
          console.error("Unable to clean up failed room type image:", cleanupError);
        }
      }
      throw error;
    }

    if (storedImage && roomType.image) {
      try {
        const remainingReferences = await prisma.roomType.count({
          where: { image: roomType.image },
        });
        if (remainingReferences === 0) {
          await removeRoomTypeImage(roomType.image);
        }
      } catch (cleanupError: unknown) {
        console.error("Unable to remove replaced room type image:", cleanupError);
      }
    }

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

    const deletedRoomType = await prisma.roomType.delete({
      where: { id },
    });

    try {
      await removeRoomTypeImage(deletedRoomType.image);
    } catch (cleanupError: unknown) {
      console.error("Unable to remove deleted room type image:", cleanupError);
    }

    res.status(204).send();
  },
);
