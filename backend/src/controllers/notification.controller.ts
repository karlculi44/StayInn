import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";

export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(notifications);
  },
);

export const markNotificationAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getStringParam(req.params.id, "notification ID");
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });

    res.json(updatedNotification);
  },
);
