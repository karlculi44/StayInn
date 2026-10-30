CREATE TYPE "ReservationRequestType" AS ENUM ('EDIT', 'CANCELLATION');
CREATE TYPE "ReservationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "ReservationHistoryAction" ADD VALUE 'EDIT_REQUESTED';
ALTER TYPE "ReservationHistoryAction" ADD VALUE 'EDIT_APPROVED';
ALTER TYPE "ReservationHistoryAction" ADD VALUE 'EDIT_REJECTED';
ALTER TYPE "ReservationHistoryAction" ADD VALUE 'CANCELLATION_REQUESTED';
ALTER TYPE "ReservationHistoryAction" ADD VALUE 'CANCELLATION_APPROVED';
ALTER TYPE "ReservationHistoryAction" ADD VALUE 'CANCELLATION_REJECTED';

ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_REQUEST_REVIEWED';

CREATE TABLE "ReservationRequest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "guestId" TEXT,
    "type" "ReservationRequestType" NOT NULL,
    "status" "ReservationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "originalValues" JSONB NOT NULL,
    "proposedChanges" JSONB,
    "reviewedBy" TEXT,
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReservationRequest_reservationId_createdAt_idx"
    ON "ReservationRequest"("reservationId", "createdAt");
CREATE INDEX "ReservationRequest_guestId_status_idx"
    ON "ReservationRequest"("guestId", "status");
CREATE INDEX "ReservationRequest_status_createdAt_idx"
    ON "ReservationRequest"("status", "createdAt");
CREATE UNIQUE INDEX "ReservationRequest_one_pending_per_reservation_idx"
    ON "ReservationRequest"("reservationId")
    WHERE "status" = 'PENDING';

ALTER TABLE "ReservationRequest"
    ADD CONSTRAINT "ReservationRequest_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationRequest"
    ADD CONSTRAINT "ReservationRequest_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReservationRequest"
    ADD CONSTRAINT "ReservationRequest_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
