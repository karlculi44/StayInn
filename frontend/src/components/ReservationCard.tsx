import { Link } from "react-router-dom";
import type { Reservation } from "../types/reservation";

type ReservationCardProps = {
  reservation: Reservation;
};

export default function ReservationCard({ reservation }: ReservationCardProps) {
  const checkIn = new Date(reservation.checkIn).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const checkOut = new Date(reservation.checkOut).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          {reservation.status}
        </p>

        <h3 className="mt-2 font-display text-2xl">
          {reservation.room.roomType.name}
        </h3>

        <p className="mt-1 text-sm text-muted">
          Room {reservation.room.roomNumber} · {checkIn} – {checkOut} ·{" "}
          {reservation.guests} guests
        </p>
      </div>

      <Link
        to={`/reservations/${reservation.id}`}
        className="text-sm font-semibold text-sage"
      >
        View reservation →
      </Link>
    </article>
  );
}
