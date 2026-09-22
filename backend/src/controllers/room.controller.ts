import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getRooms = async (req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({
    include: {
      roomType: true,
    },
  });

  res.json(rooms);
};
