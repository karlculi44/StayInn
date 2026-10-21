import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import ReservationCard from "../../components/ReservationCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getReservations } from "../../services/reservation.service";
import type { Reservation } from "../../types/reservation";

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const RESERVATION_STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchReservations = async () => {
      try {
        const data = await getReservations();
        if (isMounted) {
          setReservations(data);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load your reservations. Please try again.");
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

  const handleRetry = () => {
    setError("");
    setIsLoading(true);
    setRetryCount((count) => count + 1);
  };

  const filteredReservations =
    statusFilter === "ALL"
      ? reservations
      : reservations.filter((reservation) => reservation.status === statusFilter);
  const pageCount = Math.max(
    1,
    Math.ceil(filteredReservations.length / pageSize),
  );
  const visiblePage = Math.min(currentPage, pageCount - 1);
  const visibleReservations = filteredReservations.slice(
    visiblePage * pageSize,
    (visiblePage + 1) * pageSize,
  );

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Guest area
      </p>

      <h1 className="mt-2 font-display text-4xl">Reservations</h1>

      <div className="mt-8 space-y-4">
        {isLoading && <Loading label="Loading reservations..." />}

        {!isLoading && !error && reservations.length === 0 && (
          <>
            <EmptyState
              title="No reservations yet"
              message="Your reservations will appear here after you book a stay."
            />
            <div className="text-center">
              <Link
                to="/rooms"
                className="text-sm font-semibold text-sage hover:text-sage-dark"
              >
                Browse rooms →
              </Link>
            </div>
          </>
        )}

        {!isLoading &&
          error && (
            <div className="space-y-4">
              <ErrorState message={error} />
              <div className="text-center">
                <Button type="button" variant="secondary" onClick={handleRetry}>
                  Try again
                </Button>
              </div>
            </div>
          )}

        {!isLoading && !error && reservations.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-muted">
                Filter by status
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filter reservations by status"
                    className="h-9 w-40 rounded-lg px-2.5 py-1.5"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESERVATION_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <span className="text-sm text-muted" aria-live="polite">
                {filteredReservations.length}{" "}
                {filteredReservations.length === 1
                  ? "reservation"
                  : "reservations"}
              </span>
            </div>
            {filteredReservations.length > 0 && (
              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-muted">
                  Reservations per page
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Reservations per page"
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
                  <span
                    className="whitespace-nowrap text-muted"
                    aria-live="polite"
                  >
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
            {filteredReservations.length === 0 ? (
              <EmptyState
                title="No reservations found"
                message="There are no reservations with this status."
              />
            ) : (
              visibleReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                />
              ))
            )}
            <div className="flex flex-col gap-3 border-t border-black/10 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-muted">
                Reservations per page
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger
                    aria-label="Reservations per page"
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
          </>
        )}
      </div>
    </div>
  );
}
