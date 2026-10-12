import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/runtime.js";

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.accessToken;

  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  try {
    const decoded = jwt.verify(
      token,
      env.JWT_ACCESS_TOKEN_SECRET,
    ) as { userId: string; role: "ADMIN" | "GUEST" };

    req.user = decoded;

    next();
  } catch (err) {
    throw new AppError("Invalid or expired access token", 401);
  }
};

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
