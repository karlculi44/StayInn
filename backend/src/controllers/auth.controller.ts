import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import hashToken from "../utils/hashToken.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../config/runtime.js";
import { getAuthCookieOptions } from "../config/authCookieOptions.js";
import { hashPassword } from "../utils/password.js";

const authCookieOptions = getAuthCookieOptions(env.NODE_ENV);

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email unavailable", 409);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
    },
  });

  res.status(201).json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, jti: randomUUID() },
    env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

  const hashedRefreshToken = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashedRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie("accessToken", accessToken, {
    ...authCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    ...authCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    message: "Login successful",
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const hashedRefreshToken = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({
      where: {
        tokenHash: hashedRefreshToken,
      },
    });
  }

  res.clearCookie("accessToken", {
    ...authCookieOptions,
    maxAge: 0,
  });
  res.clearCookie("refreshToken", {
    ...authCookieOptions,
    maxAge: 0,
  });
  res.status(200).json({ message: "Logout successful" });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { userId } = req.user;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json(user);
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { firstName, lastName, email } = req.body;

    const { userId } = req.user;

    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new AppError("Email unavailable", 409);
      }
    }

    const user = await prisma.user
      .update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          email,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError("Email unavailable", 409);
        }

        throw error;
      });

    res.json(user);
  },
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { currentPassword, newPassword } = req.body;

    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new AppError("Current password is incorrect", 401);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      await tx.refreshToken.deleteMany({
        where: { userId },
      });
    });

    res.status(200).json({ message: "Password changed successfully" });
  },
);

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token required", 401);
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_TOKEN_SECRET,
    ) as {
      userId: string;
    };

    const tokenHash = hashToken(refreshToken);

    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!storedRefreshToken) {
      console.warn("Refresh token record missing", {
        event: "refresh_token_record_missing",
        userId: decoded.userId,
      });
      throw new AppError("Refresh token not found", 401);
    }

    if (storedRefreshToken.expiresAt < new Date()) {
      throw new AppError("Refresh token expired", 401);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      env.JWT_ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        jti: randomUUID(),
      },
      env.JWT_REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({
        where: {
          tokenHash,
        },
      });

      await tx.refreshToken.create({
        data: {
          tokenHash: newRefreshTokenHash,
          userId: user.id,
          expiresAt: newExpiresAt,
        },
      });
    });

    res.cookie("accessToken", newAccessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Access token refreshed",
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Invalid or expired refresh token", 401);
  }
});
