import { Link } from "react-router-dom";

export default function ReservationCard() {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">
          Upcoming stay
        </p>
        <h3 className="mt-2 font-display text-2xl">The Garden Suite</h3>
        <p className="mt-1 text-sm text-muted">Jun 14 – Jun 17, 2025 · 2 guests</p>
      </div>
      <Link to="/reservations/1" className="text-sm font-semibold text-sage">
        View reservation →
      </Link>
    </article>
  );
}
