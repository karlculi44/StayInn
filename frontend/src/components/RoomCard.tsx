import { useState } from "react";
import { Link } from "react-router-dom";
import type { RoomListing } from "../types";
import { formatCurrency } from "../utils/format";
import { getRoomTypeImage } from "../utils/room-image";

const roomStatuses = {
  AVAILABLE: { label: "Available", styles: "bg-sage/10 text-sage" },
  MAINTENANCE: {
    label: "Maintenance",
    styles: "bg-amber-100 text-amber-800",
  },
  INACTIVE: { label: "Inactive", styles: "bg-black/5 text-muted" },
} as const;

export default function RoomCard({ room }: { room: RoomListing }) {
  const [hasImageError, setHasImageError] = useState(false);
  const image = getRoomTypeImage(room.roomType.name, room.roomType.image);
  const status = roomStatuses[room.status];

  return (
    <article className="group overflow-hidden rounded-2xl bg-white">
      <Link to={`/rooms/${room.id}`} className="block">
        <div className="aspect-4/3 overflow-hidden">
          {image && !hasImageError ? (
            <img
              src={image}
              alt={room.roomType.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div
              role="img"
              aria-label={`${room.roomType.name} image unavailable`}
              className="flex h-full w-full items-center justify-center bg-cream text-sm text-muted"
            >
              Room image unavailable
            </div>
          )}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              Room {room.roomNumber}
            </p>
            <h3 className="mt-2 font-display text-2xl">
              {room.roomType.name}
            </h3>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.styles}`}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          {room.roomType.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-4">
          <p className="text-sm text-muted">
            Up to {room.roomType.capacity} guests ·{" "}
            <span className="font-semibold text-ink">
              {formatCurrency(Number(room.roomType.pricePerNight))}
            </span>{" "}
            / night
          </p>
          <Link
            to={`/rooms/${room.id}`}
            className="shrink-0 text-sm font-semibold text-sage hover:text-sage-dark"
          >
            View room →
          </Link>
        </div>
      </div>
    </article>
  );
}
