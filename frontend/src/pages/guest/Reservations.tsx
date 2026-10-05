import { EmptyState } from "../../components/ui/States";

export default function Reservations() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Guest area
      </p>
      <h1 className="mt-2 font-display text-4xl">Reservations</h1>
      <div className="mt-8">
        <EmptyState
          title="Nothing here yet"
          message="Your StayInn details will appear here once you make a reservation."
        />
      </div>
    </div>
  );
}
