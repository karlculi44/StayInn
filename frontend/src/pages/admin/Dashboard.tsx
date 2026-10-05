import { EmptyState } from "../../components/ui/States";

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

export default function Dashboard() {
  return <AdminPage />;
}
