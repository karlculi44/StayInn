import { useEffect, useState } from "react";
import { getDashboardStats } from "../../services/dashboard.service";
import { ErrorState } from "../../components/ui/States";

type DashboardStats = {
  totalUsers: number;
  totalRooms: number;
  availableRooms: number;
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  cancelledReservations: number;
};

export default function AdminPage({ title = "Overview" }: { title?: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch {
        setError("Unable to load dashboard statistics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>

      <h1 className="mt-2 font-display text-4xl">{title}</h1>

      {isLoading && (
        <p className="mt-8 text-sm text-muted">Loading dashboard...</p>
      )}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} />
        </div>
      )}

      {!isLoading && !error && stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6">
            <p className="text-sm text-muted">Total reservations</p>

            <p className="mt-3 font-display text-4xl">
              {stats.totalReservations}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6">
            <p className="text-sm text-muted">Available rooms</p>

            <p className="mt-3 font-display text-4xl">{stats.availableRooms}</p>
          </div>

          <div className="rounded-2xl bg-white p-6">
            <p className="text-sm text-muted">Total rooms</p>

            <p className="mt-3 font-display text-4xl">{stats.totalRooms}</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="rounded-2xl bg-white p-6">
          <p className="text-sm text-muted">Reservation status</p>

          {stats && (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted">Pending</p>
                <p className="mt-1 text-2xl font-semibold">
                  {stats.pendingReservations}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted">Confirmed</p>
                <p className="mt-1 text-2xl font-semibold">
                  {stats.confirmedReservations}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted">Completed</p>
                <p className="mt-1 text-2xl font-semibold">
                  {stats.completedReservations}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted">Cancelled</p>
                <p className="mt-1 text-2xl font-semibold">
                  {stats.cancelledReservations}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
