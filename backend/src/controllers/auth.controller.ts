import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email unavailable", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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
    { userId: user.id },
    process.env.JWT_ACCESS_TOKEN_SECRET as string,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" },
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
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

export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json(user);
});
