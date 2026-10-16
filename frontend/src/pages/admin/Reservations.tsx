import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import {
  getAdminReservations,
  updateReservationStatus,
} from "../../services/reservation.service";
import type {
  AdminReservation,
  ReservationStatus,
} from "../../types/admin-reservation";
import ReservationStatusBadge from "../../components/ui/ReservationStatus";
import { formatCurrency } from "../../utils/format";

const statusOptions: Array<"ALL" | ReservationStatus> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

const pageSize = 10;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const getGuestName = (reservation: AdminReservation) =>
  `${reservation.user.firstName} ${reservation.user.lastName}`.trim();

export default function Reservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReservationStatus>(
    "ALL",
  );
  const [sortBy, setSortBy] = useState<"checkIn" | "createdAt">("checkIn");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingReservationId, setUpdatingReservationId] = useState<
    string | null
  >(null);

  const fetchReservations = async () => {
    const data = await getAdminReservations();
    setReservations(data);
  };

  useEffect(() => {
    const loadReservations = async () => {
      try {
        await fetchReservations();
      } catch {
        setLoadError("Unable to load reservations.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reservations
      .filter((reservation) => {
        const matchesStatus =
          statusFilter === "ALL" || reservation.status === statusFilter;
        const matchesSearch =
          !normalizedSearch ||
          reservation.referenceId.toLowerCase().includes(normalizedSearch) ||
          getGuestName(reservation).toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort((first, second) => {
        const firstDate = new Date(first[sortBy]).getTime();
        const secondDate = new Date(second[sortBy]).getTime();

        return secondDate - firstDate;
      });
  }, [reservations, searchTerm, sortBy, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReservations.length / pageSize),
  );
  const pageToDisplay = Math.min(currentPage, totalPages);
  const paginatedReservations = filteredReservations.slice(
    (pageToDisplay - 1) * pageSize,
    pageToDisplay * pageSize,
  );

  const handleStatusChange = async (
    reservation: AdminReservation,
    status: ReservationStatus,
  ) => {
    if (status === "CANCELLED") {
      const confirmed = window.confirm(
        `Are you sure you want to cancel reservation ${reservation.referenceId}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    setUpdatingReservationId(reservation.id);
    setActionError("");
    setSuccessMessage("");

    try {
      await updateReservationStatus(reservation.id, status);
      await fetchReservations();
      setSuccessMessage(
        `Reservation ${reservation.referenceId} was updated successfully.`,
      );
    } catch {
      setActionError("Unable to update reservation status.");
    } finally {
      setUpdatingReservationId(null);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>

      <h1 className="mt-2 font-display text-4xl">Reservations</h1>

      <div className="mt-8 space-y-4">
        {isLoading && <Loading label="Loading reservations..." />}

        {loadError && <ErrorState message={loadError} />}

        {!isLoading && !loadError && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label
                  htmlFor="reservation-search"
                  className="text-sm font-medium"
                >
                  Search reservations
                </label>
                <input
                  id="reservation-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Reference ID or guest name"
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="reservation-status-filter"
                  className="text-sm font-medium"
                >
                  Status
                </label>
                <select
                  id="reservation-status-filter"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value as "ALL" | ReservationStatus,
                    );
                    setCurrentPage(1);
                  }}
                  className="mt-2 w-full rounded-xl border px-4 py-3 md:w-44"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL" ? "All statuses" : status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reservation-sort"
                  className="text-sm font-medium"
                >
                  Sort by
                </label>
                <select
                  id="reservation-sort"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as "checkIn" | "createdAt");
                    setCurrentPage(1);
                  }}
                  className="mt-2 w-full rounded-xl border px-4 py-3 md:w-44"
                >
                  <option value="checkIn">Check-in date</option>
                  <option value="createdAt">Created date</option>
                </select>
              </div>
            </div>

            {actionError && <ErrorState message={actionError} />}

            {successMessage && (
              <p
                role="status"
                className="rounded-xl border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark"
              >
                {successMessage}
              </p>
            )}

            {filteredReservations.length === 0 ? (
              <EmptyState
                title={
                  reservations.length === 0
                    ? "No reservations"
                    : "No matching reservations"
                }
                message={
                  reservations.length === 0
                    ? "Reservations will appear here when guests make bookings."
                    : "Try adjusting your search or status filter."
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl bg-white">
                  <table className="w-full min-w-262.5 text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-4">Reference ID</th>
                        <th className="px-6 py-4">Guest</th>
                        <th className="px-6 py-4">Room</th>
                        <th className="px-6 py-4">Check-in / Check-out</th>
                        <th className="px-6 py-4">Guests</th>
                        <th className="px-6 py-4">Total Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedReservations.map((reservation) => {
                        const isUpdating =
                          updatingReservationId === reservation.id;
                        const canCancel =
                          reservation.status === "PENDING" ||
                          reservation.status === "CONFIRMED";

                        return (
                          <tr
                            key={reservation.id}
                            className="border-b last:border-b-0"
                          >
                            <td className="whitespace-nowrap px-6 py-4 font-semibold">
                              {reservation.referenceId}
                            </td>

                            <td className="px-6 py-4">
                              {getGuestName(reservation)}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              <p className="font-semibold">
                                Room {reservation.room.roomNumber}
                              </p>
                              <p className="mt-1 text-muted">
                                {reservation.room.roomType.name}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              <p>{formatDate(reservation.checkIn)}</p>
                              <p className="mt-1 text-muted">
                                -{formatDate(reservation.checkOut)}
                              </p>
                            </td>

                            <td className="px-6 py-4">{reservation.guests}</td>

                            <td className="whitespace-nowrap px-6 py-4 font-semibold">
                              {formatCurrency(Number(reservation.totalAmount))}
                            </td>

                            <td className="px-6 py-4">
                              <ReservationStatusBadge
                                status={reservation.status}
                              />
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                {reservation.status === "PENDING" && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleStatusChange(
                                        reservation,
                                        "CONFIRMED",
                                      )
                                    }
                                    className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isUpdating ? "Saving..." : "Confirm"}
                                  </button>
                                )}

                                {reservation.status === "CONFIRMED" && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleStatusChange(
                                        reservation,
                                        "COMPLETED",
                                      )
                                    }
                                    className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isUpdating
                                      ? "Saving..."
                                      : "Mark completed"}
                                  </button>
                                )}

                                {canCancel && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleStatusChange(
                                        reservation,
                                        "CANCELLED",
                                      )
                                    }
                                    className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                )}

                                {reservation.status !== "PENDING" &&
                                  reservation.status !== "CONFIRMED" && (
                                    <span className="text-muted">—</span>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 text-sm">
                    <p className="text-muted">
                      Page {pageToDisplay} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pageToDisplay === 1}
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                        className="rounded-xl border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={pageToDisplay === totalPages}
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                        className="rounded-xl border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
