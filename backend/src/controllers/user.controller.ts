import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";
import {
  getProfilePictureUrl,
  removeProfilePicture,
  readProfilePicture,
} from "../services/profilePicture.js";

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json(
    users.map(({ profilePicture, ...user }) => ({
      ...user,
      profilePictureUrl: profilePicture
        ? `/api/users/${encodeURIComponent(user.id)}/profile-picture?v=${encodeURIComponent(profilePicture)}`
        : null,
    })),
  );
});

export const getGuestUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      where: { role: "GUEST" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(
      users.map(({ profilePicture, ...user }) => ({
        ...user,
        profilePictureUrl: profilePicture
          ? `/api/users/${encodeURIComponent(user.id)}/profile-picture?v=${encodeURIComponent(profilePicture)}`
          : null,
      })),
    );
  },
);

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, role } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError("Email unavailable", 409);
  }

  const hashedPassword = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        role: true,
        createdAt: true,
      },
    });

    const { profilePicture, ...createdUser } = user;
    res.status(201).json({
      ...createdUser,
      profilePictureUrl: getProfilePictureUrl(profilePicture),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Email unavailable", 409);
    }

    throw error;
  }
});

export const getUserProfilePicture = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getStringParam(req.params.id, "user ID");
    const user = await prisma.user.findUnique({
      where: { id },
      select: { profilePicture: true },
    });

    if (!user?.profilePicture) {
      throw new AppError("Profile picture not found", 404);
    }

    const { image, contentType } = await readProfilePicture(
      user.profilePicture,
    );

    res
      .status(200)
      .type(contentType)
      .set("Cache-Control", "private, max-age=31536000, immutable")
      .set("Cross-Origin-Resource-Policy", "cross-origin")
      .set("X-Content-Type-Options", "nosniff")
      .send(image);
  },
);

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

  const { profilePicture } = await prisma.$transaction(async (tx) => {
    // This lock serializes deletion with reservation inserts referencing this user.
    const lockedUsers = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    if (lockedUsers.length === 0) {
      throw new AppError("User not found", 404);
    }

    const activeReservation = await tx.reservation.findFirst({
      where: {
        userId: id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { id: true },
    });

    if (activeReservation) {
      throw new AppError(
        "Resolve pending or confirmed reservations before deleting this user",
        409,
      );
    }

    return tx.user.delete({
      where: { id },
      select: { profilePicture: true },
    });
  });

  if (profilePicture) {
    try {
      await removeProfilePicture(profilePicture);
    } catch (error: unknown) {
      console.error("Unable to remove deleted user's profile picture:", error);
    }
  }

  res.status(204).send();
});
