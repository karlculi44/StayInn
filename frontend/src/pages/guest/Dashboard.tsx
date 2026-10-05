import ReservationCard from "../../components/ReservationCard";
import SectionTitle from "../SectionTitle";
import { useAuth } from "../../context/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

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
        <SectionTitle eyebrow="Next up" title="Your reservations" />

        <div className="mt-6">
          <ReservationCard />
        </div>
      </div>
    </div>
  );
}
