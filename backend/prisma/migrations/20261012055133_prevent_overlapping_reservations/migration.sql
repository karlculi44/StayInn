--Create a constraint to prevent overlapping active reservations for the same room
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_no_overlapping_active_bookings"
EXCLUDE USING gist (
    "roomId" WITH =,
    tsrange("checkIn", "checkOut", '[)') WITH &&
)
WHERE (status <> 'CANCELLED');
