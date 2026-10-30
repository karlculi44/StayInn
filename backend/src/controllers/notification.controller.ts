import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStringParam } from "../utils/getParam.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";

type NotificationRow = Prisma.NotificationGetPayload<{
  include: {
    recipients: {
      select: {
        isRead: true;
        readAt: true;
      };
    };
  };
}>;

const serializeNotifications = async (rows: NotificationRow[]) => {
  const reservationIds = rows.flatMap((notification) =>
    notification.referenceType === "RESERVATION" && notification.referenceId
      ? [notification.referenceId]
      : [],
  );
  const reservations = reservationIds.length
    ? await prisma.reservation.findMany({
        where: { id: { in: reservationIds } },
        select: {
          id: true,
          referenceId: true,
          status: true,
          user: { select: { firstName: true, lastName: true } },
        },
      })
    : [];
  const reservationsById = new Map(
    reservations.map((reservation) => [reservation.id, reservation]),
  );

  return rows.map(({ recipients, ...notification }) => {
    const recipient = recipients[0];
    const reservation =
      notification.referenceType === "RESERVATION" &&
      notification.referenceId
        ? reservationsById.get(notification.referenceId)
        : undefined;

    return {
      ...notification,
      readAt: recipient?.readAt ?? null,
      isRead: recipient?.isRead ?? false,
      reservation: reservation
        ? {
            id: reservation.id,
            referenceId: reservation.referenceId,
            status: reservation.status,
            guestName: reservation.user
              ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
              : null,
          }
        : null,
    };
  });
};

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
        recipients: {
          some: {
            userId: req.user.userId,
            ...(unreadOnly ? { isRead: false } : {}),
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        recipients: {
          where: { userId: req.user.userId },
          select: { isRead: true, readAt: true },
        },
      },
      ...(limit === undefined ? {} : { take: limit }),
      ...(offset === undefined ? {} : { skip: offset }),
    });

    res.json(await serializeNotifications(notifications));
  },
);

export const getUnreadNotificationCount = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const count = await prisma.notification.count({
      where: {
        recipients: {
          some: { userId: req.user.userId, isRead: false },
        },
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
    const result = await prisma.notificationRecipient.updateMany({
      where: {
        userId: req.user.userId,
        isRead: false,
      },
      data: { isRead: true, readAt },
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

    const recipient = await prisma.notificationRecipient.findUnique({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId: req.user.userId,
        },
      },
      include: {
        notification: {
          include: {
            recipients: {
              where: { userId: req.user.userId },
              select: { isRead: true, readAt: true },
            },
          },
        },
      },
    });

    if (!recipient) {
      throw new AppError("Notification not found", 404);
    }

    const updatedRecipient = await prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: {
        isRead: true,
        readAt: recipient.readAt ?? new Date(),
      },
      include: {
        notification: {
          include: {
            recipients: {
              where: { userId: req.user.userId },
              select: { isRead: true, readAt: true },
            },
          },
        },
      },
    });

    const [updatedNotification] = await serializeNotifications([
      updatedRecipient.notification,
    ]);
    res.json(updatedNotification);
  },
);
