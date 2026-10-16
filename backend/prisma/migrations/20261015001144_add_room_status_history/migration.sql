-- CreateTable
CREATE TABLE "RoomStatusHistory" (
    "id" TEXT NOT NULL,
    "previousStatus" "RoomStatus" NOT NULL,
    "newStatus" "RoomStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT,
    "adminId" TEXT,

    CONSTRAINT "RoomStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomStatusHistory_roomId_createdAt_idx" ON "RoomStatusHistory"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "RoomStatusHistory_adminId_createdAt_idx" ON "RoomStatusHistory"("adminId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomStatusHistory" ADD CONSTRAINT "RoomStatusHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomStatusHistory" ADD CONSTRAINT "RoomStatusHistory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
