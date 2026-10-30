-- CreateEnum
CREATE TYPE "ReservationHistoryAction" AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED', 'UPDATED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReservationHistoryVisibility" AS ENUM ('ADMIN_ONLY', 'GUEST_VISIBLE');

-- CreateTable
CREATE TABLE "ReservationHistory" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "ReservationHistoryAction" NOT NULL,
    "description" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "visibility" "ReservationHistoryVisibility" NOT NULL DEFAULT 'GUEST_VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationHistory_reservationId_createdAt_idx" ON "ReservationHistory"("reservationId", "createdAt");

-- CreateIndex
CREATE INDEX "ReservationHistory_reservationId_visibility_createdAt_idx" ON "ReservationHistory"("reservationId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "ReservationHistory_actorId_createdAt_idx" ON "ReservationHistory"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReservationHistory" ADD CONSTRAINT "ReservationHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationHistory" ADD CONSTRAINT "ReservationHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
