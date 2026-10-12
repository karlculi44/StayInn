import { useEffect, useState } from "react";
import { ButtonLink } from "../../components/ui/Button";
import { Button } from "../../components/ui/Button";
import RoomCard from "../../components/RoomCard";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { getRooms } from "../../services/room.service";
import type { RoomListing } from "../../types";
import SectionTitle from "../SectionTitle";
import { rooms } from "../shared";

export default function Home() {
  const [featuredRooms, setFeaturedRooms] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const data = await getRooms();
        if (isMounted) {
          setFeaturedRooms(data.slice(0, 3));
        }
      } catch {
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchRooms();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

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
        {isLoading && (
          <div className="mt-10">
            <Loading label="Loading rooms..." />
          </div>
        )}
        {!isLoading && hasError && (
          <div className="mt-10 space-y-4">
            <ErrorState message="We couldn't load rooms right now. Please try again." />
            <div className="text-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}
        {!isLoading && !hasError && featuredRooms.length === 0 && (
          <div className="mt-10">
            <EmptyState
              title="No rooms to display"
              message="Please check back later for room listings."
            />
          </div>
        )}
        {!isLoading && !hasError && featuredRooms.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
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
