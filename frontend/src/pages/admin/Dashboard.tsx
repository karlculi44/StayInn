import { useEffect, useState } from "react";
import {
  getDashboardStats,
  type DashboardStats,
} from "../../services/dashboard.service";
import { ErrorState } from "../../components/ui/States";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type TooltipSnapshot = { name: string | number | undefined; count: number };

// Remembers the last hovered segment so its content stays rendered while fading out.
function ReservationTooltip({
  active,
  name,
  count,
  total,
}: {
  active: boolean;
  name: string | number | undefined;
  count: number | null;
  total: number;
}) {
  const [last, setLast] = useState<TooltipSnapshot | null>(null);
  const isVisible = active && count !== null;

  if (isVisible && (!last || last.name !== name || last.count !== count)) {
    setLast({ name, count });
  }

  const shown = isVisible ? { name, count } : last;

  if (!shown) {
    return null;
  }

  const percentage =
    total > 0 ? ((shown.count / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      className="chart-tooltip-fade rounded-lg border border-sage/20 bg-white px-3 py-2 text-sm shadow-lg"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <p className="font-semibold text-ink">{shown.name}</p>
      <p className="text-muted">
        {shown.count} {shown.count === 1 ? "reservation" : "reservations"} (
        {percentage}%)
      </p>
    </div>
  );
}

export default function AdminPage({ title = "Overview" }: { title?: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInitialStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch {
        setError("Unable to load dashboard statistics.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInitialStats();
  }, []);

  const refreshStats = async () => {
    setError("");
    if (stats === null) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      setError("Unable to load dashboard statistics.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const reservationStatusData = stats
    ? [
        {
          status: "PENDING",
          name: "Pending",
          count: stats.pendingReservations,
          color: "#D6A84F",
        },
        {
          status: "CONFIRMED",
          name: "Confirmed",
          count: stats.confirmedReservations,
          color: "#547A67",
        },
        {
          status: "CANCELLED",
          name: "Cancelled",
          count: stats.cancelledReservations,
          color: "#C7685A",
        },
        {
          status: "COMPLETED",
          name: "Completed",
          count: stats.completedReservations,
          color: "#7E8FA6",
        },
      ]
    : [];

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
          {!stats && (
            <button
              className="mt-3 rounded-lg border border-sage/30 px-4 py-2 text-sm font-semibold text-sage transition hover:bg-sage/5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || isRefreshing}
              onClick={refreshStats}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {!isLoading && stats && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-6">
              <p className="text-sm text-muted">Total reservations</p>

              <p className="mt-3 font-display text-4xl">
                {stats.totalReservations}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6">
              <p className="text-sm text-muted">Available rooms</p>

              <p className="mt-3 font-display text-4xl">
                {stats.availableRooms}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6">
              <p className="text-sm text-muted">Total rooms</p>

              <p className="mt-3 font-display text-4xl">{stats.totalRooms}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">
                  Reservation Status Distribution
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {stats.totalReservations} total reservations
                </p>
              </div>

              <button
                className="rounded-lg border border-sage/30 px-4 py-2 text-sm font-semibold text-sage transition hover:bg-sage/5 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isRefreshing || isLoading}
                onClick={refreshStats}
                type="button"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="relative mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reservationStatusData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={54}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {reservationStatusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    isAnimationActive={false}
                    allowEscapeViewBox={{ x: false, y: false }}
                    offset={12}
                    // Recharts hides the wrapper instantly when inactive; keep it
                    // visible so the content can fade out via opacity instead.
                    wrapperStyle={{
                      transition: "none",
                      visibility: "visible",
                      zIndex: 10,
                    }}
                    content={({ active, payload }) => (
                      <ReservationTooltip
                        active={Boolean(active)}
                        name={payload?.[0]?.name}
                        count={
                          payload?.[0] ? Number(payload[0].value ?? 0) : null
                        }
                        total={stats.totalReservations}
                      />
                    )}
                  />
                  <Legend
                    align="center"
                    formatter={(value) => {
                      const item = reservationStatusData.find(
                        (status) => status.name === value,
                      );

                      return (
                        <span className="text-xs text-muted">
                          {value}: {item?.count ?? 0}
                        </span>
                      );
                    }}
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {stats.totalReservations === 0 && (
                <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-muted">
                  No reservations yet
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
