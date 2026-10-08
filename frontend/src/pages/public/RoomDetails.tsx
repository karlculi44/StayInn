import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/format";
import { rooms } from "../shared";
import { getRoom, getAvailableRooms } from "../../services/room.service";
import { createReservation } from "../../services/reservation.service";

type Room = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: {
    name: string;
    description: string;
    capacity: number;
    pricePerNight: string;
  };
};

export default function RoomDetails() {
  const { id } = useParams();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const staticRoom = rooms.find((item) => item.id === id) ?? rooms[0];

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) {
        return;
      }

      try {
        const data = await getRoom(id);
        setRoom(data);
      } catch (error) {
        console.error("Error fetching room:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  if (isLoading) {
    return <div>Loading room...</div>;
  }

  if (!room) {
    return <div>Room not found.</div>;
  }

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut || !room) {
      return;
    }

    setIsChecking(true);
    setAvailabilityError("");
    setIsAvailable(null);

    try {
      const availableRooms = await getAvailableRooms(checkIn, checkOut);

      const roomIsAvailable = availableRooms.some(
        (availableRoom: Room) => availableRoom.id === room.id,
      );

      setIsAvailable(roomIsAvailable);
    } catch {
      setAvailabilityError("Unable to check availability.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleBooking = async () => {
    if (!room || !checkIn || !checkOut || !isAvailable) {
      return;
    }

    setIsBooking(true);
    setBookingError("");

    try {
      const reservation = await createReservation(
        room.id,
        checkIn,
        checkOut,
        guests,
      );

      navigate(`/reservations/${reservation.id}`);
    } catch {
      setBookingError("Unable to create reservation.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <Link to="/rooms" className="text-sm font-semibold text-sage">
        ← Back to rooms
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <img
          src={staticRoom.image}
          alt={room.roomType.name}
          className="aspect-4/3 w-full rounded-3xl object-cover"
        />

        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Room {room.roomNumber} · {room.roomType.name}
          </p>

          <h1 className="mt-4 font-display text-5xl">{room.roomType.name}</h1>

          <p className="mt-6 text-lg leading-8 text-muted">
            {room.roomType.description}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Capacity</p>
              <p className="mt-1 font-semibold">
                {room.roomType.capacity} guests
              </p>
            </div>

            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Status</p>
              <p className="mt-1 font-semibold text-sage">{room.status}</p>
            </div>

            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Room</p>
              <p className="mt-1 font-semibold">{room.roomNumber}</p>
            </div>
          </div>

          <div className="my-8 grid gap-3 border-y border-black/10 py-6 text-sm text-muted">
            {staticRoom.features.map((feature) => (
              <span key={feature}>✦ {feature}</span>
            ))}
          </div>

          <p className="text-2xl font-semibold">
            {formatCurrency(Number(room.roomType.pricePerNight))}{" "}
            <span className="text-sm font-normal text-muted">/ night</span>
          </p>

          <div className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Check-in
                <input
                  type="date"
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium">
                Check-out
                <input
                  type="date"
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3"
                />
              </label>
              <div>
                <label htmlFor="guests" className="block text-sm font-semibold">
                  Guests
                </label>

                <input
                  id="guests"
                  type="number"
                  min={1}
                  max={room.roomType.capacity}
                  value={guests}
                  onChange={(event) => setGuests(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />

                <p className="mt-1 text-xs text-muted">
                  Maximum {room.roomType.capacity} guests
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={isChecking || !checkIn || !checkOut}
              className="mt-4 w-full rounded-xl bg-sage px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {isChecking ? "Checking..." : "Check availability"}
            </button>

            {isAvailable && (
              <button
                type="button"
                onClick={handleBooking}
                disabled={isBooking}
                className="w-full rounded-xl bg-sage mt-2 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {isBooking ? "Booking..." : "Book this room"}
              </button>
            )}

            {bookingError && (
              <p className="text-sm text-red-600">{bookingError}</p>
            )}

            {isAvailable === true && (
              <p className="mt-3 text-sm text-sage">
                This room is available for your selected dates.
              </p>
            )}

            {isAvailable === false && (
              <p className="mt-3 text-sm text-red-600">
                This room is not available for your selected dates.
              </p>
            )}

            {availabilityError && (
              <p className="mt-3 text-sm text-red-600">{availabilityError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
