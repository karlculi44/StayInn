import ReservationCard from "../../components/ReservationCard";
import SectionTitle from "../SectionTitle";

export default function Dashboard() {
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
