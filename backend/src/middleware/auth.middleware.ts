import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/runtime.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const verifyToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken;

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    let userId: string;

    try {
      const decoded = jwt.verify(
        token,
        env.JWT_ACCESS_TOKEN_SECRET,
      );

      if (typeof decoded === "string" || typeof decoded.userId !== "string") {
        throw new Error("Invalid access-token subject");
      }

      userId = decoded.userId;
    } catch {
      throw new AppError("Invalid or expired access token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new AppError("Invalid or expired access token", 401);
    }

    req.user = { userId: user.id, role: user.role };

    next();
  },
);

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("Access denied", 403);
    }

    next();
  };
};
