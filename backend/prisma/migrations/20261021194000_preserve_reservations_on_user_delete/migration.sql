ALTER TABLE "Reservation" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_userId_fkey";

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
