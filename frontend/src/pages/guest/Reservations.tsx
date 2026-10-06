import { useEffect, useState } from "react";
import { EmptyState, ErrorState } from "../../components/ui/States";
import ReservationCard from "../../components/ReservationCard";
import { getReservations } from "../../services/reservation.service";
import type { Reservation } from "../../types/reservation";

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const data = await getReservations();
        setReservations(data);
      } catch {
        setError("Unable to load your reservations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, []);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Guest area
      </p>

      <h1 className="mt-2 font-display text-4xl">Reservations</h1>

      <div className="mt-8 space-y-4">
        {isLoading && <p>Loading reservations...</p>}

        {error && <ErrorState message={error} />}

        {!isLoading && !error && reservations.length === 0 && (
          <EmptyState
            title="Nothing here yet"
            message="Your StayInn details will appear here once you make a reservation."
          />
        )}

        {!isLoading &&
          !error &&
          reservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
      </div>
    </div>
  );
}
