import { Link, useParams } from "react-router-dom";
import { ButtonLink } from "../../components/ui/Button";
import { formatCurrency } from "../../utils/format";
import { rooms } from "../shared";

export default function RoomDetails() {
  const { id } = useParams();
  const room = rooms.find((item) => item.id === id) ?? rooms[0];
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <Link to="/rooms" className="text-sm font-semibold text-sage">
        ← Back to rooms
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <img
          src={room.image}
          alt={room.name}
          className="aspect-4/3 w-full rounded-3xl object-cover"
        />
        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Room {room.roomNumber} · {room.roomType}
          </p>
          <h1 className="mt-4 font-display text-5xl">{room.name}</h1>
          <p className="mt-6 text-lg leading-8 text-muted">{room.description}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Capacity</p>
              <p className="mt-1 font-semibold">{room.capacity} guests</p>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Status</p>
              <p className="mt-1 font-semibold text-sage">{room.status}</p>
            </div>
            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Room</p>
              <p className="mt-1 font-semibold">{room.roomNumber}</p>
            </div>
          </div>
          <div className="my-8 grid gap-3 border-y border-black/10 py-6 text-sm text-muted">
            {room.features.map((feature) => (
              <span key={feature}>✦ {feature}</span>
            ))}
          </div>
          <p className="text-2xl font-semibold">
            {formatCurrency(room.pricePerNight)}{" "}
            <span className="text-sm font-normal text-muted">/ night</span>
          </p>
          <ButtonLink to="/login" className="mt-6 w-full">
            Reserve this room
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
