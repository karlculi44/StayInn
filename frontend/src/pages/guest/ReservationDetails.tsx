import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/States";
import {
  cancelReservation,
  getReservation,
} from "../../services/reservation.service";
import type { Reservation } from "../../types/reservation";
import ReservationStatus from "../../components/ui/ReservationStatus";

export default function ReservationDetails() {
  const { id } = useParams();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReservation = async () => {
      if (!id) {
        return;
      }

      try {
        const data = await getReservation(id);
        setReservation(data);
      } catch {
        setReservation(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservation();
  }, [id]);

  const handleCancel = async () => {
    if (!id || !reservation) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this reservation?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setIsCancelling(true);

    try {
      await cancelReservation(id);

      const updatedReservation = await getReservation(id);
      setReservation(updatedReservation);
    } catch {
      setError("Unable to cancel this reservation.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <div>Loading reservation...</div>;
  }

  if (!reservation) {
    return (
      <EmptyState
        title="Reservation not found"
        message="We couldn't find the reservation you're looking for."
      />
    );
  }

  const checkIn = new Date(reservation.checkIn).toLocaleDateString();
  const checkOut = new Date(reservation.checkOut).toLocaleDateString();

  const canCancel =
    reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Guest area
      </p>

      <h1 className="mt-2 font-display text-4xl">Reservation details</h1>

      <div className="mt-8 rounded-2xl bg-white p-6">
        <ReservationStatus status={reservation.status} />

        <h2 className="mt-2 font-display text-3xl">
          {reservation.room.roomType.name}
        </h2>

        <div className="mt-6 space-y-2 text-sm text-muted">
          <p>Room {reservation.room.roomNumber}</p>
          <p>
            {checkIn} – {checkOut}
          </p>
          <p>{reservation.guests} guests</p>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="mt-6 text-sm font-semibold text-red-600 disabled:opacity-50"
          >
            {isCancelling ? "Cancelling..." : "Cancel reservation"}
          </button>
        )}

        <div>
          <Link
            to="/reservations"
            className="mt-6 inline-block text-sm font-semibold text-sage"
          >
            ← Back to reservations
          </Link>
        </div>
      </div>
    </div>
  );
}
