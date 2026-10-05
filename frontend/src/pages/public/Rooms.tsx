import RoomCard from "../../components/RoomCard";
import SectionTitle from "../SectionTitle";
import { rooms } from "../shared";

export default function Rooms() {
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
