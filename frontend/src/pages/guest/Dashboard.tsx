import { useEffect, useState } from "react";
import SectionTitle from "../SectionTitle";
import { useAuth } from "../../context/useAuth";
import { Button, ButtonLink } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import ReservationCard from "../../components/ReservationCard";
import { getReservations } from "../../services/reservation.service";
import type { Reservation } from "../../types/reservation";

export default function Dashboard() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
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

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Your space
      </p>

      <h1 className="mt-2 font-display text-4xl">
        Good morning, {user?.firstName}.
      </h1>

      <p className="mt-3 text-muted">
        Everything for your next stay, in one place.
      </p>

      <div className="mt-10">
        <SectionTitle eyebrow="Next up" title="Your reservations">
          <ButtonLink to="/dashboard/reservations" variant="secondary">
            See All Reservations
          </ButtonLink>
        </SectionTitle>

        <div className="mt-6 space-y-4">
          {isLoading && <Loading label="Loading reservations..." />}

          {!isLoading && error && (
            <div className="space-y-4">
              <ErrorState message={error} />
              <div className="text-center">
                <Button type="button" variant="secondary" onClick={handleRetry}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !error && reservations.length === 0 && (
            <EmptyState
              title="No reservations yet"
              message="Your reservations will appear here after you book a stay."
            />
          )}

          {!isLoading &&
            !error &&
            reservations.slice(0, 3).map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))}
        </div>
      </div>
    </div>
  );
}
