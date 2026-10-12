import { useState } from "react";
import { Link } from "react-router-dom";
import type { Reservation } from "../types/reservation";
import { formatCurrency } from "../utils/format";
import ReservationStatus from "./ui/ReservationStatus";

type ReservationCardProps = {
  reservation: Reservation;
};

export default function ReservationCard({ reservation }: ReservationCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const image = reservation.room.roomType.image?.trim();
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
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-5 sm:flex-row sm:items-center">
      {image && !hasImageError ? (
        <img
          src={image}
          alt={reservation.room.roomType.name}
          className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-36"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div
          role="img"
          aria-label={`${reservation.room.roomType.name} image unavailable`}
          className="flex h-32 w-full items-center justify-center rounded-xl bg-cream text-sm text-muted sm:h-24 sm:w-36"
        >
          Image unavailable
        </div>
      )}

      <div className="flex-1">
        <ReservationStatus status={reservation.status} />
        <h3 className="mt-2 font-display text-2xl">
          {reservation.room.roomType.name}
        </h3>
        <p className="mt-1 text-sm text-muted">
          Room {reservation.room.roomNumber} · {checkIn} – {checkOut} ·{" "}
          {reservation.guests} guests
        </p>
        <p className="mt-2 text-sm font-semibold">
          {formatCurrency(Number(reservation.totalAmount))}
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
