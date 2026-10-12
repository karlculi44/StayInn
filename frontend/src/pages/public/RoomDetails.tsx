import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/format";
import { rooms } from "../shared";
import { getRoom, getAvailableRooms } from "../../services/room.service";
import { createReservation } from "../../services/reservation.service";
import axios from "axios";

type Room = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: {
    name: string;
    description: string;
    capacity: number;
    pricePerNight: string;
    image: string | null;
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
  const [fallbackImageRoomId, setFallbackImageRoomId] = useState<string | null>(
    null,
  );
  const [imageErrorRoomId, setImageErrorRoomId] = useState<string | null>(null);
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

    if (new Date(checkOut) <= new Date(checkIn)) {
      setAvailabilityError("Check-out must be after check-in.");
      setIsAvailable(null);
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setBookingError(
          error.response?.data?.message || "Unable to create reservation.",
        );
      } else {
        setBookingError("Unable to create reservation.");
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleGuestsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);

    if (value >= 1 && value <= room.roomType.capacity) {
      setGuests(value);
    }
  };

  const getNights = () => {
    if (!checkIn || !checkOut) {
      return 0;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const difference = end.getTime() - start.getTime();

    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  };

  const nights = getNights();
  const total = nights * Number(room.roomType.pricePerNight);
  const roomImage = room.roomType.image?.trim();
  const isUsingFallbackImage = fallbackImageRoomId === room.id;
  const hasImageError = imageErrorRoomId === room.id;
  const imageSource =
    roomImage && !isUsingFallbackImage ? roomImage : staticRoom.image;

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <Link to="/rooms" className="text-sm font-semibold text-sage">
        ← Back to rooms
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {hasImageError ? (
            <div
              role="img"
              aria-label={`${room.roomType.name} image unavailable`}
              className="flex aspect-4/3 w-full items-center justify-center rounded-3xl bg-cream text-muted"
            >
              Room image unavailable
            </div>
          ) : (
            <img
              src={imageSource}
              alt={room.roomType.name}
              className="aspect-4/3 w-full rounded-3xl object-cover"
              onError={() => {
                if (roomImage && !isUsingFallbackImage) {
                  setFallbackImageRoomId(room.id);
                } else {
                  setImageErrorRoomId(room.id);
                }
              }}
            />
          )}
        </div>

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
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium">
                Check-out
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split("T")[0]}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3"
                />
              </label>

              <label htmlFor="guests" className="block text-sm font-semibold">
                Guests
                <input
                  id="guests"
                  type="number"
                  min={1}
                  max={room.roomType.capacity}
                  value={guests}
                  onChange={handleGuestsChange}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
                <p className="mt-1 text-xs text-muted">
                  Maximum {room.roomType.capacity} guests
                </p>
              </label>
            </div>

            {isAvailable && nights > 0 && (
              <div className="mt-4 rounded-2xl bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gold">
                  Booking summary
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Room</span>
                    <span>{room.roomType.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Guests</span>
                    <span>{guests}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Nights</span>
                    <span>{nights}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Price per night</span>
                    <span>
                      ₱{Number(room.roomType.pricePerNight).toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₱{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
