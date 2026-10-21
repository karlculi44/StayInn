import { useEffect, useState } from "react";
import {
  getRoomStatusHistory,
  type RoomStatus,
  type RoomStatusHistoryEntry,
} from "../../services/roomStatusHistory.service";
import { ErrorState } from "../../components/ui/States";
import { adminRaisedLight } from "../../components/ui/adminButtonStyles";

const statusStyles: Record<RoomStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

function StatusBadge({ status }: { status: RoomStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusStyles[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}

export default function RoomStatusHistory() {
  const [history, setHistory] = useState<RoomStatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<RoomStatusHistoryEntry | null>(
    null,
  );

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getRoomStatusHistory();
        setHistory(data);
      } catch {
        setError("Unable to load room status history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEntry(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedEntry]);

  if (isLoading) {
    return <p className="p-6 text-gray-500">Loading room status history...</p>;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Room Status History
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review previous room status changes.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-4 font-medium">Room</th>
              <th className="px-6 py-4 font-medium">Previous Status</th>
              <th className="px-6 py-4 font-medium">New Status</th>
              <th className="px-6 py-4 font-medium">Reason</th>
              <th className="px-6 py-4 font-medium">Changed By</th>
              <th className="px-6 py-4 font-medium">Date and Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {history.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {entry.room ? (
                    entry.room.roomNumber
                  ) : (
                    <span className="text-gray-500">Deleted room</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={entry.previousStatus} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={entry.newStatus} />
                </td>
                <td className="min-w-64 px-6 py-4 text-gray-600">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    title={entry.reason}
                    className="block max-w-[20rem] truncate text-left text-sage hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    {entry.reason}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {entry.admin ? (
                    `${entry.admin.firstName} ${entry.admin.lastName}`.trim()
                  ) : (
                    <span className="text-gray-500">Unknown administrator</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                  {formatDateTime(entry.createdAt)}
                </td>
              </tr>
            ))}

            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No room status changes have been recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedEntry(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-change-details-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-4xl cursor-default overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                  Room {selectedEntry.room?.roomNumber ?? "Deleted"}
                </p>
                <h2
                  id="status-change-details-title"
                  className="mt-1 font-display text-2xl"
                >
                  Status Change Details
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close status change details"
                onClick={() => setSelectedEntry(null)}
                className={`rounded-lg px-3 py-2 text-sm text-gray-700 ${adminRaisedLight}`}
              >
                Close
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 rounded-2xl bg-gray-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Previous Status
                </dt>
                <dd className="mt-2">
                  <StatusBadge status={selectedEntry.previousStatus} />
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  New Status
                </dt>
                <dd className="mt-2">
                  <StatusBadge status={selectedEntry.newStatus} />
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Changed By
                </dt>
                <dd className="mt-2 break-words font-medium text-gray-900">
                  {selectedEntry.admin
                    ? `${selectedEntry.admin.firstName} ${selectedEntry.admin.lastName}`.trim()
                    : "Unknown administrator"}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date and Time
                </dt>
                <dd className="mt-2 break-words font-medium text-gray-900">
                  {formatDateTime(selectedEntry.createdAt)}
                </dd>
              </div>
            </dl>

            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                Full Reason
              </h3>
              <p className="mt-4 min-h-32 whitespace-pre-wrap break-words text-base leading-7 text-gray-800">
                {selectedEntry.reason}
              </p>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
