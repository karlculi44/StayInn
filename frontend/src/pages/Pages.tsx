import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { Button, ButtonLink } from "../components/ui/Button";
import { EmptyState, ErrorState } from "../components/ui/States";
import Input from "../components/Input";
import RoomCard from "../components/RoomCard";
import ReservationCard from "../components/ReservationCard";
import { formatCurrency } from "../utils/format";
import type { Room } from "../types";

const rooms: Room[] = [
  {
    id: "garden-suite",
    roomNumber: "101",
    name: "The Garden Suite",
    roomType: "Suite",
    description:
      "A sun-filled retreat with a private garden and a deep soaking tub.",
    capacity: 2,
    pricePerNight: 240,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    tag: "Guest favourite",
    features: ["King bed", "Private garden", "Breakfast included"],
  },
  {
    id: "coastal-loft",
    roomNumber: "204",
    name: "Coastal Loft",
    roomType: "Deluxe Room",
    description:
      "Quiet mornings, salt air, and a view that makes you want to stay longer.",
    capacity: 3,
    pricePerNight: 310,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    features: ["Ocean view", "Fireplace", "Workspace"],
  },
  {
    id: "city-studio",
    roomNumber: "305",
    name: "City Studio",
    roomType: "Studio",
    description:
      "A considered city base with everything you need to settle in.",
    capacity: 2,
    pricePerNight: 185,
    status: "Occupied",
    image:
      "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80",
    features: ["King bed", "Kitchenette", "Self check-in"],
  },
];

function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-sage-dark">
        <img
          src={rooms[0].image}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35 mix-blend-luminosity"
        />
        <div className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-40">
          <div className="max-w-xl text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
              StayInn hotel · Your stay, considered
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] sm:text-7xl">
              Come for the room. Stay for the feeling.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-white/75">
              A calm, comfortable hotel in the heart of the city, with
              thoughtful details and a warm welcome every time you stay.
            </p>
            <ButtonLink
              to="/rooms"
              variant="ghost"
              className="mt-8 bg-white text-sage hover:bg-sage hover:text-white "
            >
              Book a room <span className="ml-2">→</span>
            </ButtonLink>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionTitle
          eyebrow="Find your place"
          title="Rooms made for unwinding"
        >
          <ButtonLink to="/rooms" variant="ghost">
            View all rooms →
          </ButtonLink>
        </SectionTitle>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-8 lg:px-8">
        <div className="grid gap-8 rounded-3xl bg-[#e6ede8] p-8 sm:p-12 md:grid-cols-3">
          <div>
            <p className="font-display text-3xl">01</p>
            <p className="mt-4 font-semibold">Made for unwinding</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              No busy lobbies or unnecessary extras. Just space to reset.
            </p>
          </div>
          <div>
            <p className="font-display text-3xl">02</p>
            <p className="mt-4 font-semibold">The details matter</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Good coffee, soft sheets, and everything in its right place.
            </p>
          </div>
          <div>
            <p className="font-display text-3xl">03</p>
            <p className="mt-4 font-semibold">Stay your way</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Book directly, arrive easily, and settle in at your own pace.
            </p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionTitle
          eyebrow="Everything you need"
          title="Thoughtful amenities"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Complimentary breakfast",
            "Fast Wi-Fi",
            "24-hour front desk",
            "Private parking",
          ].map((amenity) => (
            <div
              key={amenity}
              className="rounded-2xl border border-black/10 bg-white p-5"
            >
              <p className="text-2xl text-gold">✦</p>
              <p className="mt-5 font-semibold">{amenity}</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Included with every StayInn visit.
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-8 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-sage-dark p-8 text-white sm:p-12 md:flex-row md:items-center">
          <div>
            <p className="font-display text-3xl">Make yourself at home.</p>
            <p className="mt-2 text-white/70">
              Find your room and start planning your next stay.
            </p>
          </div>
          <ButtonLink
            to="/rooms"
            variant="ghost"
            className="bg-white text-sage hover:bg-sage hover:text-white"
          >
            Book a room
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

export function RoomsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <SectionTitle eyebrow="Find your stay" title="Rooms made for living">
        <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-muted">
          StayInn rooms
        </div>
      </SectionTitle>
      <p className="mt-5 max-w-xl text-muted">
        Choose a space that matches your pace, from quiet garden retreats to
        easy city bases.
      </p>
      <div className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}

export function RoomDetailPage() {
  const { id } = useParams();
  const room = rooms.find((item) => item.id === id) ?? rooms[0];
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <Link to="/rooms" className="text-sm font-semibold text-sage">
        ← Back to rooms
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <img
          src={room.image}
          alt={room.name}
          className="aspect-4/3 w-full rounded-3xl object-cover"
        />
        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Room {room.roomNumber} · {room.roomType}
          </p>
          <h1 className="mt-4 font-display text-5xl">{room.name}</h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            {room.description}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-cream p-3">
              <p className="text-muted">Capacity</p>
              <p className="mt-1 font-semibold">{room.capacity} guests</p>
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
            {room.features.map((feature) => (
              <span key={feature}>✦ {feature}</span>
            ))}
          </div>
          <p className="text-2xl font-semibold">
            {formatCurrency(room.pricePerNight)}{" "}
            <span className="text-sm font-normal text-muted">/ night</span>
          </p>
          <ButtonLink to="/login" className="mt-6 w-full">
            Reserve this room
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 600);
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Welcome to StayInn
      </p>
      <h1 className="mt-3 font-display text-4xl">
        {register ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {register
          ? "Create an account to manage every StayInn reservation."
          : "Sign in to manage your StayInn reservations."}
      </p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {register && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="first-name"
              label="First name"
              placeholder="Alex"
              required
            />
            <Input
              id="last-name"
              label="Last name"
              placeholder="Morgan"
              required
            />
          </div>
        )}
        <Input
          id="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          minLength={8}
          required
        />
        {register && (
          <Input
            id="confirm-password"
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        )}
        {error && <ErrorState message={error} />}
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading
            ? "Please wait..."
            : register
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {register ? "Already have an account? " : "New to StayInn? "}
        <Link
          to={register ? "/login" : "/register"}
          className="font-semibold text-sage"
        >
          {register ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}

export function DashboardPage() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Your space
      </p>
      <h1 className="mt-2 font-display text-4xl">Good morning, Alex.</h1>
      <p className="mt-3 text-muted">
        Everything for your next stay, in one place.
      </p>
      <div className="mt-10">
        <SectionTitle eyebrow="Next up" title="Your reservations" />
        <div className="mt-6">
          <ReservationCard />
        </div>
      </div>
    </div>
  );
}

export function GuestPage({ title }: { title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Guest area
      </p>
      <h1 className="mt-2 font-display text-4xl">{title}</h1>
      <div className="mt-8">
        <EmptyState
          title="Nothing here yet"
          message="Your StayInn details will appear here once you make a reservation."
        />
      </div>
    </div>
  );
}

export function AdminPage({ title = "Overview" }: { title?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>
      <h1 className="mt-2 font-display text-4xl">{title}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {["Occupancy", "Reservations", "Available rooms"].map((label, i) => (
          <div key={label} className="rounded-2xl bg-white p-6">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-3 font-display text-4xl">
              {[78, 24, 16][i]}
              <span className="text-xl text-muted">{i === 0 ? "%" : ""}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <EmptyState
          title="No recent activity"
          message="New reservations and guest updates will appear here."
        />
      </div>
    </div>
  );
}
