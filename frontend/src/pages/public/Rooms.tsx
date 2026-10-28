import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getRooms } from "../../services/room.service";
import type { RoomListing } from "../../types";
import { formatCurrency } from "../../utils/format";
import { getRoomTypeImage } from "../../utils/room-image";
import SectionTitle from "../SectionTitle";

const PAGE_SIZE_OPTIONS = [6, 12, 24];

export default function Rooms() {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(0);

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

  const roomTypes = useMemo(
    () =>
      Array.from(
        new Map(
          rooms.map((room) => [room.roomType.id, room.roomType.name]),
        ).entries(),
      ),
    [rooms],
  );
  const filteredRooms = useMemo(
    () =>
      roomTypeFilter === "ALL"
        ? rooms
        : rooms.filter((room) => room.roomType.id === roomTypeFilter),
    [rooms, roomTypeFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount - 1);
  const visibleRooms = filteredRooms.slice(
    visiblePage * pageSize,
    (visiblePage + 1) * pageSize,
  );

  const roomStatuses = {
    AVAILABLE: { label: "Available", styles: "bg-sage/10 text-sage" },
    MAINTENANCE: {
      label: "Maintenance",
      styles: "bg-amber-100 text-amber-800",
    },
    INACTIVE: { label: "Inactive", styles: "bg-black/5 text-muted" },
  } as const;

  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <SectionTitle eyebrow="Find your stay" title="Rooms made for living">
        <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-muted">
          StayInn rooms
        </div>
      </SectionTitle>
      <p className="mt-5 max-w-xl text-muted">
        Browse our rooms and find the right fit for your stay.
      </p>
      {!isLoading && !hasError && rooms.length > 0 && (
        <div className="mt-6 max-w-xs">
          <label
            htmlFor="public-room-type-filter"
            className="mb-2 block text-sm font-medium"
          >
            Room type
          </label>
          <Select
            value={roomTypeFilter}
            onValueChange={(value) => {
              setRoomTypeFilter(value);
              setCurrentPage(0);
            }}
          >
            <SelectTrigger id="public-room-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All room types</SelectItem>
              {roomTypes.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
      {!isLoading && !hasError && filteredRooms.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title={
              rooms.length === 0 ? "No rooms to display" : "No matching rooms"
            }
            message={
              rooms.length === 0
                ? "Please check back later for room listings."
                : "Try selecting a different room type."
            }
          />
        </div>
      )}
      {!isLoading && !hasError && filteredRooms.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-muted">
              Rooms per page
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(0);
                }}
              >
                <SelectTrigger
                  aria-label="Rooms per page"
                  className="h-9 w-20 rounded-lg px-2.5 py-1.5"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <span className="whitespace-nowrap text-muted" aria-live="polite">
                Page {visiblePage + 1} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={visiblePage === 0}
                  onClick={() => setCurrentPage(visiblePage - 1)}
                  className="px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={visiblePage >= pageCount - 1}
                  onClick={() => setCurrentPage(visiblePage + 1)}
                  className="px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleRooms.map((room) => {
              const status = roomStatuses[room.status];
              const image = getRoomTypeImage(
                room.roomType.name,
                room.roomType.image,
              );

              return (
                <article
                  key={room.id}
                  className="h-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <Link
                    to={`/rooms/${room.id}`}
                    className="group flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
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
                              {formatCurrency(
                                Number(room.roomType.pricePerNight),
                              )}
                            </span>{" "}
                            / night
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-sage group-hover:text-sage-dark">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}
      {!isLoading && !hasError && filteredRooms.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 border-t border-black/10 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-muted">
            Rooms per page
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(0);
              }}
            >
              <SelectTrigger
                aria-label="Rooms per page"
                className="h-9 w-20 rounded-lg px-2.5 py-1.5"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className="whitespace-nowrap text-muted" aria-live="polite">
              Page {visiblePage + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={visiblePage === 0}
                onClick={() => setCurrentPage(visiblePage - 1)}
                className="px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={visiblePage >= pageCount - 1}
                onClick={() => setCurrentPage(visiblePage + 1)}
                className="px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
