import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
 
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json(users);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const id = getStringParam(req.params.id, "user ID");

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json(user);
});

export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "user ID");

    if (req.user?.userId === id) {
      throw new AppError("You cannot change your own role", 403);
    }

    const { role } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  },
);

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = getStringParam(req.params.id, "user ID");

  if (req.user?.userId === id) {
    throw new AppError("You cannot delete your own account", 403);
  }

  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      reservations: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.reservations.length > 0) {
    throw new AppError(
      "User has existing reservations and cannot be deleted",
      400,
    );
  }

  await prisma.user.delete({
    where: {
      id,
    },
  });

  res.status(204).send();
});
