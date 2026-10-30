import type {
  NotificationReferenceType,
  NotificationType,
  Prisma,
} from "@prisma/client";

type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
  recipientIds: string[];
};

export const createNotification = async (
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) => {
  const notification = await tx.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      ...(input.referenceId === undefined
        ? {}
        : { referenceId: input.referenceId }),
      ...(input.referenceType === undefined
        ? {}
        : { referenceType: input.referenceType }),
    },
  });

  if (input.recipientIds.length > 0) {
    await tx.notificationRecipient.createMany({
      data: input.recipientIds.map((userId) => ({
        notificationId: notification.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  return notification;
};
