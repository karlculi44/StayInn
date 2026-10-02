import { Link } from "react-router-dom";
import type { Room } from "../types";
import { formatCurrency } from "../utils/format";

export default function RoomCard({ room }: { room: Room }) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-white">
      <Link to={`/rooms/${room.id}`} className="block">
        <div className="aspect-4/3 overflow-hidden">
          <img
            src={room.image}
            alt={room.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              Room {room.roomNumber} · {room.roomType}
            </p>
            <h3 className="mt-2 font-display text-2xl">{room.name}</h3>
          </div>
          <span className="rounded-full bg-sage/10 px-2.5 py-1 text-xs font-semibold text-sage">
            {room.status}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{room.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-4">
          <p className="text-sm text-muted">
            Up to {room.capacity} guests ·{" "}
            <span className="font-semibold text-ink">
              {formatCurrency(room.pricePerNight)}
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
