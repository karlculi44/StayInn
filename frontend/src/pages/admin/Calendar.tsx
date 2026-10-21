import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type { EventInput } from "@fullcalendar/core";
import { Link } from "react-router-dom";
import { getAdminReservations } from "../../services/reservation.service";
import type {
  AdminReservation,
  ReservationStatus,
} from "../../types/admin-reservation";
import { ErrorState, Loading } from "../../components/ui/States";
import ReservationStatusBadge from "../../components/ui/ReservationStatus";
import { formatCurrency } from "../../utils/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const reservationStatuses: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];
const statusOptions: Array<"ALL" | ReservationStatus> = [
  "ALL",
  ...reservationStatuses,
];

const statusColors: Record<
  ReservationStatus,
  { backgroundColor: string; borderColor: string; textColor?: string }
> = {
  PENDING: { backgroundColor: "#a16207", borderColor: "#854d0e" },
  CONFIRMED: { backgroundColor: "#15803d", borderColor: "#166534" },
  CANCELLED: { backgroundColor: "#b91c1c", borderColor: "#991b1b" },
  COMPLETED: { backgroundColor: "#1d4ed8", borderColor: "#1e40af" },
};
const pastReservationColors: Record<
  ReservationStatus,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  PENDING: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    textColor: "#92400e",
  },
  CONFIRMED: {
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
    textColor: "#166534",
  },
  CANCELLED: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    textColor: "#991b1b",
  },
  COMPLETED: {
    backgroundColor: "#dbeafe",
    borderColor: "#bfdbfe",
    textColor: "#1e40af",
  },
};

type VisibleRange = {
  start: string;
  end: string;
};

const toCalendarDate = (value: string) => value.slice(0, 10);

const formatReservationDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${toCalendarDate(value)}T00:00:00.000Z`));

const getGuestName = (reservation: AdminReservation) =>
  reservation.user
    ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
    : "Deleted user";

export default function Calendar() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReservationStatus>(
    "ALL",
  );
  const [selectedReservation, setSelectedReservation] =
    useState<AdminReservation | null>(null);
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const previousStatusFilter = useRef(statusFilter);

  useLayoutEffect(() => {
    if (previousStatusFilter.current === statusFilter) {
      return;
    }
    previousStatusFilter.current = statusFilter;

    const calendar = calendarRef.current;
    if (
      !calendar ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const animation = calendar.animate(
      [{ opacity: 0.7 }, { opacity: 1 }],
      { duration: 160, easing: "ease-out" },
    );

    return () => animation.cancel();
  }, [statusFilter]);

  useEffect(() => {
    let isMounted = true;

    const fetchReservations = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await getAdminReservations();
        if (isMounted) {
          setReservations(data);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load reservations.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReservations();
    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  useEffect(() => {
    if (!selectedReservation) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedReservation(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedReservation]);

  const events = useMemo<EventInput[]>(
    () => {
      const today = new Date().toISOString().slice(0, 10);

      return reservations
        .filter(
          (reservation) =>
            statusFilter === "ALL" || reservation.status === statusFilter,
        )
        .map((reservation) => {
          const isPast = toCalendarDate(reservation.checkOut) <= today;
          const colors = isPast
            ? pastReservationColors[reservation.status]
            : statusColors[reservation.status];

          return {
            id: reservation.id,
            title: getGuestName(reservation),
            start: toCalendarDate(reservation.checkIn),
            end: toCalendarDate(reservation.checkOut),
            allDay: true,
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            ...(colors.textColor ? { textColor: colors.textColor } : {}),
            extendedProps: {
              roomNumber: reservation.room.roomNumber,
            },
          };
        });
    },
    [reservations, statusFilter],
  );

  const hasVisibleReservations = useMemo(
    () =>
      reservations.some((reservation) => {
        const matchesStatus =
          statusFilter === "ALL" || reservation.status === statusFilter;
        const checkIn = toCalendarDate(reservation.checkIn);
        const checkOut = toCalendarDate(reservation.checkOut);
        const overlapsVisibleRange =
          visibleRange === null ||
          (checkIn < visibleRange.end && checkOut > visibleRange.start);

        return matchesStatus && overlapsVisibleRange;
      }),
    [reservations, statusFilter, visibleRange],
  );

  const handleDatesSet = ({ startStr, endStr }: DatesSetArg) => {
    setVisibleRange({ start: startStr.slice(0, 10), end: endStr.slice(0, 10) });
  };

  const handleEventClick = ({ event }: EventClickArg) => {
    setSelectedReservation(
      reservations.find((reservation) => reservation.id === event.id) ?? null,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Admin workspace
          </p>
          <h1 className="mt-2 font-display text-4xl">Calendar</h1>
          <p className="mt-2 text-sm text-muted">
            View guest stays and room bookings by date.
          </p>
        </div>
        <div className="min-w-48">
          <label
            htmlFor="calendar-status-filter"
            className="mb-2 block text-sm font-medium"
          >
            Reservation status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as "ALL" | ReservationStatus)
            }
          >
            <SelectTrigger id="calendar-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "ALL"
                    ? "All statuses"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        aria-label="Reservation status legend"
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
      >
        {reservationStatuses.map((status) => (
          <span key={status} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{ backgroundColor: statusColors[status].backgroundColor }}
            />
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted">
        Past reservations retain their status color in a lighter shade.
      </p>

      {isLoading ? (
        <Loading label="Loading reservations..." />
      ) : error ? (
        <div className="space-y-4">
          <ErrorState message={error} />
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-xl bg-sage px-4 py-2 font-semibold text-white"
          >
            Try again
          </button>
        </div>
      ) : (
        <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-5">
          {!hasVisibleReservations && (
            <p className="mb-3 rounded-lg bg-cream px-4 py-3 text-sm text-muted">
              No reservations match this status in the displayed dates.
            </p>
          )}
          <div
            ref={calendarRef}
            className="stayinn-calendar min-h-144 overflow-x-auto"
          >
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              buttonText={{ today: "Today" }}
              events={events}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              eventDisplay="block"
              dayMaxEvents
              height="auto"
              fixedWeekCount={false}
              eventContent={({ event }) => (
                <div className="min-w-0 px-1 py-0.5 text-xs leading-4">
                  <p className="truncate font-semibold">{event.title}</p>
                  <p className="truncate">
                    Room {event.extendedProps.roomNumber}
                  </p>
                </div>
              )}
            />
          </div>
        </section>
      )}

      {selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedReservation(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-reservation-title"
            className="animate-ui-enter my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                  Reservation
                </p>
                <h2
                  id="calendar-reservation-title"
                  className="mt-2 font-display text-3xl"
                >
                  {selectedReservation.referenceId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                aria-label="Close reservation details"
                className="rounded-lg px-3 py-2 text-muted hover:bg-cream"
              >
                Close
              </button>
            </div>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Guest</dt>
                <dd className="mt-1 font-semibold">
                  {getGuestName(selectedReservation)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="mt-1 font-semibold">
                  {selectedReservation.user?.email ?? "Unavailable"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Room</dt>
                <dd className="mt-1 font-semibold">
                  Room {selectedReservation.room.roomNumber} ·{" "}
                  {selectedReservation.room.roomType.name}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-1">
                  <ReservationStatusBadge status={selectedReservation.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">Check-in</dt>
                <dd className="mt-1 font-semibold">
                  {formatReservationDate(selectedReservation.checkIn)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Check-out</dt>
                <dd className="mt-1 font-semibold">
                  {formatReservationDate(selectedReservation.checkOut)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Guests</dt>
                <dd className="mt-1 font-semibold">
                  {selectedReservation.guests}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Total</dt>
                <dd className="mt-1 font-semibold">
                  {formatCurrency(Number(selectedReservation.totalAmount))}
                </dd>
              </div>
            </dl>
            <Link
              to={`/admin/reservations/${selectedReservation.id}`}
              state={{ from: "/admin/calendar" }}
              onClick={() => setSelectedReservation(null)}
              className="mt-6 inline-flex rounded-lg font-semibold text-sage underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
            >
              View full reservation details
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
