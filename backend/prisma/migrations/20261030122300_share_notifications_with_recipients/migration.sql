CREATE TYPE "NotificationReferenceType" AS ENUM ('RESERVATION');

ALTER TYPE "NotificationType" ADD VALUE 'NEW_RESERVATION';

ALTER TABLE "Notification"
    ADD COLUMN "referenceId" TEXT,
    ADD COLUMN "referenceType" "NotificationReferenceType";

UPDATE "Notification"
SET
    "referenceId" = "reservationId",
    "referenceType" = CASE
        WHEN "reservationId" IS NOT NULL THEN 'RESERVATION'::"NotificationReferenceType"
        ELSE NULL
    END;

CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

INSERT INTO "NotificationRecipient" (
    "id",
    "notificationId",
    "userId",
    "isRead",
    "readAt"
)
SELECT
    gen_random_uuid()::TEXT,
    "id",
    "userId",
    "readAt" IS NOT NULL,
    "readAt"
FROM "Notification";

DROP INDEX "Notification_userId_createdAt_idx";

ALTER TABLE "Notification"
    DROP CONSTRAINT "Notification_userId_fkey",
    DROP CONSTRAINT "Notification_reservationId_fkey",
    DROP COLUMN "userId",
    DROP COLUMN "readAt",
    DROP COLUMN "reservationId";

CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_referenceType_referenceId_idx"
    ON "Notification"("referenceType", "referenceId");
CREATE UNIQUE INDEX "Notification_new_reservation_unique_idx"
    ON "Notification"("referenceId")
    WHERE "type" = 'NEW_RESERVATION'
      AND "referenceType" = 'RESERVATION'
      AND "referenceId" IS NOT NULL;

CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key"
    ON "NotificationRecipient"("notificationId", "userId");
CREATE INDEX "NotificationRecipient_userId_isRead_idx"
    ON "NotificationRecipient"("userId", "isRead");

ALTER TABLE "NotificationRecipient"
    ADD CONSTRAINT "NotificationRecipient_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRecipient"
    ADD CONSTRAINT "NotificationRecipient_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
