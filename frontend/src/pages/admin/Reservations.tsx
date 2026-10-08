import { useEffect, useState } from "react";
import { ErrorState, EmptyState } from "../../components/ui/States";
import {
  getAdminReservations,
  updateReservationStatus,
} from "../../services/reservation.service";
import type { AdminReservation } from "../../types/admin-reservation";

export default function Reservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const data = await getAdminReservations();
        setReservations(data);
      } catch {
        setError("Unable to load reservations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updatedReservation = await updateReservationStatus(id, status);

      setReservations((currentReservations) =>
        currentReservations.map((reservation) =>
          reservation.id === id
            ? { ...reservation, status: updatedReservation.status }
            : reservation,
        ),
      );
    } catch {
      setError("Unable to update reservation status.");
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>

      <h1 className="mt-2 font-display text-4xl">Reservations</h1>

      <div className="mt-8 space-y-4">
        {isLoading && <p>Loading reservations...</p>}

        {error && <ErrorState message={error} />}

        {!isLoading && !error && reservations.length === 0 && (
          <EmptyState
            title="No reservations"
            message="Reservations will appear here when guests make bookings."
          />
        )}

        {!isLoading &&
          !error &&
          reservations.map((reservation) => (
            <article key={reservation.id} className="rounded-2xl bg-white p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gold">
                    {reservation.status}
                  </p>

                  <h2 className="mt-2 font-display text-2xl">
                    {reservation.room.roomType.name}
                  </h2>

                  <p className="mt-1 text-sm text-muted">
                    Room {reservation.room.roomNumber}
                  </p>

                  <p className="mt-1 text-sm text-muted">
                    {reservation.user.firstName} {reservation.user.lastName}
                  </p>

                  <p className="text-sm text-muted">{reservation.user.email}</p>
                </div>

                <div className="text-sm">
                  <p>
                    Check-in:{" "}
                    {new Date(reservation.checkIn).toLocaleDateString()}
                  </p>

                  <p>
                    Check-out:{" "}
                    {new Date(reservation.checkOut).toLocaleDateString()}
                  </p>

                  <p className="mt-1">Guests: {reservation.guests}</p>

                  <p className="mt-1 font-semibold">
                    ₱{Number(reservation.totalAmount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                {reservation.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(reservation.id, "CONFIRMED")
                      }
                      className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white cursor-pointer"
                    >
                      Confirm
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(reservation.id, "CANCELLED")
                      }
                      className="rounded-xl border px-4 py-2 text-sm font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {reservation.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(reservation.id, "COMPLETED")
                    }
                    className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white cursor-pointer"
                  >
                    Mark completed
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
