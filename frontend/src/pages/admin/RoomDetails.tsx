import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, Loading } from "../../components/ui/States";
import { getAdminRoom } from "../../services/room.service";
import type { RoomListing } from "../../types";
import { formatCurrency } from "../../utils/format";
import { getRoomTypeImage } from "../../utils/room-image";
import { adminRaisedLight } from "../../components/ui/adminButtonStyles";

type RoomResult = {
  id: string;
  room?: RoomListing;
  error?: string;
};

export default function AdminRoomDetails() {
  const { roomId } = useParams<{ roomId: string }>();
  const [result, setResult] = useState<RoomResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!roomId) {
      return () => {
        isMounted = false;
      };
    }

    void getAdminRoom(roomId)
      .then((room) => {
        if (isMounted) {
          setResult({ id: roomId, room });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setResult({
            id: roomId,
            error:
              axios.isAxiosError(error) && error.response?.status === 404
                ? "Room not found."
                : "Unable to load this room.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const currentResult = result?.id === roomId ? result : null;
  const room = currentResult?.room;
  const error = currentResult?.error;

  if (!roomId) {
    return (
      <div className="space-y-5">
        <Link
          to="/admin/rooms"
          className="text-sm font-semibold text-sage hover:text-sage-dark"
        >
          ← Back to rooms
        </Link>
        <ErrorState message="Room not found." />
      </div>
    );
  }

  if (!room && !error) {
    return <Loading label="Loading room details..." />;
  }

  if (error || !room) {
    return (
      <div className="space-y-5">
        <Link
          to="/admin/rooms"
          className="text-sm font-semibold text-sage hover:text-sage-dark"
        >
          ← Back to rooms
        </Link>
        <ErrorState message={error ?? "Room not found."} />
      </div>
    );
  }

  const image = getRoomTypeImage(room.roomType.name, room.roomType.image);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          Admin workspace · Room {room.roomNumber}
        </p>
        <h1 className="mt-2 font-display text-4xl">Room Details</h1>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <img
          src={image}
          alt={`Room ${room.roomNumber} - ${room.roomType.name}`}
          className="aspect-4/3 size-full object-cover lg:aspect-auto lg:min-h-96"
        />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted">
                Room {room.roomNumber}
              </p>
              <h2 className="mt-1 font-display text-3xl">
                {room.roomType.name}
              </h2>
            </div>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
              {room.status}
            </span>
          </div>

          <p className="mt-5 leading-7 text-muted">
            {room.roomType.description}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cream p-4">
              <dt className="text-sm text-muted">Capacity</dt>
              <dd className="mt-1 font-semibold">
                {room.roomType.capacity}{" "}
                {room.roomType.capacity === 1 ? "guest" : "guests"}
              </dd>
            </div>
            <div className="rounded-xl bg-cream p-4">
              <dt className="text-sm text-muted">Price per night</dt>
              <dd className="mt-1 font-semibold">
                {formatCurrency(Number(room.roomType.pricePerNight))}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-cream p-4">
              <dt className="text-sm text-muted">Room type</dt>
              <dd className="mt-1 font-semibold">{room.roomType.name}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <Link
              to="/admin/rooms"
              className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold ${adminRaisedLight}`}
            >
              Back to room management
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
