import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/States";
import {
  cancelReservation,
  getReservation,
} from "../../services/reservation.service";
import type { Reservation } from "../../types/reservation";
import ReservationStatus from "../../components/ui/ReservationStatus";
import { formatCurrency } from "../../utils/format";
import { getRoomTypeImage } from "../../utils/room-image";
import axios from "axios";

export default function ReservationDetails() {
  const { id } = useParams();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [failedImage, setFailedImage] = useState("");

  useEffect(() => {
    const fetchReservation = async () => {
      if (!id) {
        return;
      }

      try {
        const data = await getReservation(id);
        setReservation(data);
      } catch (error) {
        setReservation(null);
        if (
          !axios.isAxiosError(error) ||
          ![403, 404].includes(error.response?.status ?? 0)
        ) {
          setRequestError("Unable to load this reservation. Please try again.");
        }
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
        title={
          requestError ? "Unable to load reservation" : "Reservation not found"
        }
        message={
          requestError || "We couldn't find the reservation you're looking for."
        }
      />
    );
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const checkIn = formatDate(reservation.checkIn);
  const checkOut = formatDate(reservation.checkOut);
  const createdAt = formatDate(reservation.createdAt);
  const nights = Math.max(
    0,
    Math.ceil(
      (new Date(reservation.checkOut).getTime() -
        new Date(reservation.checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const roomImage = getRoomTypeImage(
    reservation.room.roomType.name,
    reservation.room.roomType.image,
  );
  const showRoomImage = roomImage && failedImage !== roomImage;

  const canCancel =
    reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  return (
    <div>
      <Link
        to="/reservations"
        className="mt-6 inline-block text-sm font-semibold text-sage"
      >
        ← Back to reservations
      </Link>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold mt-9">
        Guest area
      </p>

      <h1 className="mt-2 font-display text-4xl">Reservation details</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">
                  Reference ID
                </p>
                <p className="mt-1 break-all font-semibold">
                  {reservation.referenceId}
                </p>
              </div>
              <ReservationStatus status={reservation.status} />
            </div>
            <p className="mt-4 text-sm text-muted">Booked on {createdAt}</p>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white">
            {showRoomImage ? (
              <img
                src={roomImage}
                alt={reservation.room.roomType.name}
                className="aspect-video w-full object-cover"
                onError={() => setFailedImage(roomImage)}
              />
            ) : (
              <div
                role="img"
                aria-label={`${reservation.room.roomType.name} image unavailable`}
                className="flex aspect-video w-full items-center justify-center bg-cream text-muted"
              >
                Room image unavailable
              </div>
            )}
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gold">
                Room {reservation.room.roomNumber}
              </p>
              <h2 className="mt-2 font-display text-3xl">
                {reservation.room.roomType.name}
              </h2>
              {reservation.room.roomType.description && (
                <p className="mt-3 leading-7 text-muted">
                  {reservation.room.roomType.description}
                </p>
              )}
              <p className="mt-4 text-sm text-muted">
                Capacity: {reservation.room.roomType.capacity} guests
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6">
            <h2 className="font-display text-2xl">Stay details</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Check-in</dt>
                <dd className="mt-1 font-semibold">{checkIn}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Check-out</dt>
                <dd className="mt-1 font-semibold">{checkOut}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Length of stay</dt>
                <dd className="mt-1 font-semibold">
                  {nights} {nights === 1 ? "night" : "nights"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Guests</dt>
                <dd className="mt-1 font-semibold">{reservation.guests}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-white p-6">
          <h2 className="font-display text-2xl">Price summary</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted">
                {formatCurrency(
                  Number(reservation.room.roomType.pricePerNight),
                )}{" "}
                × {nights} {nights === 1 ? "night" : "nights"}
              </span>
              <span className="font-medium">
                {formatCurrency(
                  Number(reservation.room.roomType.pricePerNight) * nights,
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-4">
              <span className="font-semibold">Total amount</span>
              <span className="text-xl font-bold">
                {formatCurrency(Number(reservation.totalAmount))}
              </span>
            </div>
          </div>

          {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

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
        </aside>
      </div>
    </div>
  );
}
