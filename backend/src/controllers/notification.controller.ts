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

export const getUnreadNotificationCount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const count = await prisma.notification.count({
      where: {
        userId: req.user.userId,
        readAt: null,
      },
    });

    res.json({ count });
  },
);

export const markAllNotificationsAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const readAt = new Date();
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.userId,
        readAt: null,
      },
      data: { readAt },
    });

    res.json({ count: result.count, readAt: readAt.toISOString() });
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
