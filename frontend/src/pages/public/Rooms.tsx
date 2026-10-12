import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { getRooms } from "../../services/room.service";
import type { RoomListing } from "../../types";
import { formatCurrency } from "../../utils/format";
import SectionTitle from "../SectionTitle";

const roomImages: Record<string, string> = {
  "Standard Room":
    "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80",
  "Deluxe Room":
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "Family Room":
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
};
const defaultRoomImage = roomImages["Standard Room"];

export default function Rooms() {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const data = await getRooms();
        if (isMounted) {
          setRooms(data);
        }
      } catch {
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchRooms();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const roomStatuses = {
    AVAILABLE: { label: "Available", styles: "bg-sage/10 text-sage" },
    MAINTENANCE: {
      label: "Maintenance",
      styles: "bg-amber-100 text-amber-800",
    },
    INACTIVE: { label: "Inactive", styles: "bg-black/5 text-muted" },
  } as const;

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <SectionTitle eyebrow="Find your stay" title="Rooms made for living">
        <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-muted">
          StayInn rooms
        </div>
      </SectionTitle>
      <p className="mt-5 max-w-xl text-muted">
        Browse our rooms and find the right fit for your stay.
      </p>
      {isLoading && (
        <div className="mt-10">
          <Loading label="Loading rooms..." />
        </div>
      )}
      {!isLoading && hasError && (
        <div className="mt-10 space-y-4">
          <ErrorState message="We couldn't load rooms right now. Please try again." />
          <div className="text-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </Button>
          </div>
        </div>
      )}
      {!isLoading && !hasError && rooms.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title="No rooms to display"
            message="Please check back later for room listings."
          />
        </div>
      )}
      {!isLoading && !hasError && rooms.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const status = roomStatuses[room.status];
            const image =
              room.roomType.image ??
              roomImages[room.roomType.name] ??
              defaultRoomImage;

            return (
              <article
                key={room.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
              >
                <div className="aspect-4/3 overflow-hidden">
                  <img
                    src={image}
                    alt={`${room.roomType.name} at StayInn`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gold">
                        Room {room.roomNumber}
                      </p>
                      <h2 className="mt-2 font-display text-2xl">
                        {room.roomType.name}
                      </h2>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.styles}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-6 text-muted">
                    {room.roomType.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-black/10 pt-4">
                    <div>
                      <p className="text-sm text-muted">
                        Up to {room.roomType.capacity} guests
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        <span className="font-semibold text-ink">
                          {formatCurrency(Number(room.roomType.pricePerNight))}
                        </span>{" "}
                        / night
                      </p>
                    </div>
                    <Link
                      to={`/rooms/${room.id}`}
                      className="text-sm font-semibold text-sage hover:text-sage-dark"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
