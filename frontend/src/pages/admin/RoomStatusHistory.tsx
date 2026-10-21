import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getRoomStatusHistory,
  type RoomStatus,
  type RoomStatusHistoryEntry,
} from "../../services/roomStatusHistory.service";
import { ErrorState, Loading } from "../../components/ui/States";
import DataTable from "../../components/ui/DataTable";
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
  const [selectedEntry, setSelectedEntry] =
    useState<RoomStatusHistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const historyColumns = useMemo<
    ColumnDef<RoomStatusHistoryEntry, unknown>[]
  >(
    () => [
      {
        id: "room",
        accessorFn: (entry) => entry.room?.roomNumber ?? "Deleted room",
        header: "Room",
        cell: ({ row }) =>
          row.original.room ? (
            <span className="font-semibold text-ink">
              {row.original.room.roomNumber}
            </span>
          ) : (
            <span className="text-muted">Deleted room</span>
          ),
      },
      {
        accessorKey: "previousStatus",
        header: "Previous Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.previousStatus} />
        ),
      },
      {
        accessorKey: "newStatus",
        header: "New Status",
        cell: ({ row }) => <StatusBadge status={row.original.newStatus} />,
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedEntry(row.original)}
            title={row.original.reason}
            className="block max-w-[20rem] truncate text-left text-sage hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
          >
            {row.original.reason}
          </button>
        ),
        enableSorting: false,
      },
      {
        id: "changedBy",
        accessorFn: (entry) =>
          entry.admin
            ? `${entry.admin.firstName} ${entry.admin.lastName}`.trim()
            : "Unknown administrator",
        header: "Changed By",
        cell: ({ row }) =>
          row.original.admin ? (
            `${row.original.admin.firstName} ${row.original.admin.lastName}`.trim()
          ) : (
            <span className="text-muted">Unknown administrator</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Date and Time",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
        meta: { className: "whitespace-nowrap text-muted" },
      },
    ],
    [],
  );
  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return history;
    }

    return history.filter((entry) =>
      [
        entry.room?.roomNumber ?? "Deleted room",
        entry.previousStatus,
        entry.newStatus,
        entry.reason,
        entry.admin
          ? `${entry.admin.firstName} ${entry.admin.lastName}`
          : "Unknown administrator",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [history, searchTerm]);

  if (isLoading) {
    return <Loading label="Loading room status history..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          Admin workspace
        </p>
        <h1 className="mt-2 font-display text-4xl">Room Status History</h1>
        <p className="mt-3 text-sm text-muted">
          Review previous room status changes.
        </p>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <label htmlFor="room-history-search" className="text-sm font-medium">
          Search history
        </label>
        <input
          id="room-history-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search room, status, reason, or administrator"
          className="mt-2 w-full rounded-xl border px-4 py-3"
        />
      </div>
      <DataTable
        columns={historyColumns}
        data={filteredHistory}
        emptyMessage={
          history.length === 0
            ? "No room status changes have been recorded yet."
            : "No history entries match your search."
        }
        tableClassName="min-w-[54rem]"
      />

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
            className="animate-ui-enter max-h-[calc(100vh-2rem)] w-full max-w-4xl cursor-default overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
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
                <dd className="mt-2 wrap-break-word font-medium text-gray-900">
                  {selectedEntry.admin
                    ? `${selectedEntry.admin.firstName} ${selectedEntry.admin.lastName}`.trim()
                    : "Unknown administrator"}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date and Time
                </dt>
                <dd className="mt-2 wrap-break-word font-medium text-gray-900">
                  {formatDateTime(selectedEntry.createdAt)}
                </dd>
              </div>
            </dl>

            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                Full Reason
              </h3>
              <p className="mt-4 min-h-32 whitespace-pre-wrap wrap-break-word text-base leading-7 text-gray-800">
                {selectedEntry.reason}
              </p>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
