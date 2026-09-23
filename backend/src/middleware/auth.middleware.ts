import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";

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
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
    ) as { userId: string; role: "ADMIN" | "GUEST" };

    req.user = decoded;

    next();
  } catch (err) {
    throw new AppError("Invalid or expired access token", 401);
  }
};
