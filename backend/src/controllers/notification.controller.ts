import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";

const parseIntegerQuery = (
  value: unknown,
  name: string,
  minimum: number,
  maximum?: number,
) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new AppError(`Invalid ${name}`, 400);
  }

  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    (maximum !== undefined && parsed > maximum)
  ) {
    throw new AppError(`Invalid ${name}`, 400);
  }

  return parsed;
};

const parseUnreadOnlyQuery = (value: unknown) => {
  if (value === undefined) {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new AppError("Invalid unreadOnly filter", 400);
};

export const getNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const limit = parseIntegerQuery(req.query.limit, "limit", 1, 100);
    const offset = parseIntegerQuery(req.query.offset, "offset", 0);
    const unreadOnly = parseUnreadOnlyQuery(req.query.unreadOnly);
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(limit === undefined ? {} : { take: limit }),
      ...(offset === undefined ? {} : { skip: offset }),
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
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
      throw new AppError("Invalid notification ID", 400);
    }

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
