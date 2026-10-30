import { useEffect, useState } from "react";
import { getReservationHistory } from "../../services/reservation.service";
import type {
  ReservationHistory,
  ReservationHistoryAction,
  ReservationHistoryValue,
} from "../../types/reservation-history";
import { formatCurrency } from "../../utils/format";
import { Button } from "./Button";
import { EmptyState, ErrorState, Loading } from "./States";

const actionTitles: Record<ReservationHistoryAction, string> = {
  CREATED: "Reservation received",
  CONFIRMED: "Reservation confirmed",
  CANCELLED: "Reservation cancelled",
  UPDATED: "Reservation details updated",
  COMPLETED: "Reservation completed",
};

function formatHistoryValue(key: string, value: ReservationHistoryValue) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return key === "totalAmount" ? formatCurrency(value) : String(value);
  }

  if (typeof value !== "string") {
    return JSON.stringify(value);
  }

  if (key === "status") {
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  if (key === "checkIn" || key === "checkOut") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(date);
  }

  if (key === "totalAmount") {
    const amount = Number(value);
    return Number.isNaN(amount) ? value : formatCurrency(amount);
  }

  return value;
}

function formatHistoryLabel(key: string) {
  if (key === "checkIn") return "Check-in";
  if (key === "checkOut") return "Check-out";
  if (key === "totalAmount") return "Total";
  if (key === "guestChanged") return "Guest assignment changed";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function HistoryIcon({ action }: { action: ReservationHistoryAction }) {
  return (
    <span
      aria-hidden="true"
      className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ${
        action === "CANCELLED"
          ? "bg-red-100 text-red-700"
          : action === "CONFIRMED" || action === "COMPLETED"
            ? "bg-green-100 text-green-700"
            : "bg-sage/15 text-sage"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        {action === "CREATED" && (
          <>
            <path d="M5 4h14v17H5z" />
            <path d="M9 4V3h6v1m-7 6h8m-8 4h8m-8 4h5" />
          </>
        )}
        {action === "CONFIRMED" && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.5 2.5L16 9" />
          </>
        )}
        {action === "CANCELLED" && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="m9 9 6 6m0-6-6 6" />
          </>
        )}
        {action === "UPDATED" && (
          <>
            <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z" />
          </>
        )}
        {action === "COMPLETED" && (
          <>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </>
        )}
      </svg>
    </span>
  );
}

export default function ReservationHistoryTimeline({
  reservationId,
  isAdmin = false,
  refreshKey = "",
}: {
  reservationId: string;
  isAdmin?: boolean;
  refreshKey?: string;
}) {
  const [history, setHistory] = useState<ReservationHistory[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [completedRequestKey, setCompletedRequestKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorRequestKey, setErrorRequestKey] = useState("");
  const requestKey = `${reservationId}:${refreshKey}:${retryCount}`;
  const isLoading = completedRequestKey !== requestKey;
  const error = errorRequestKey === requestKey ? errorMessage : "";

  useEffect(() => {
    let isMounted = true;

    void getReservationHistory(reservationId)
      .then((data) => {
        if (isMounted) {
          setHistory(data);
          setCompletedRequestKey(requestKey);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage(
            "Unable to load reservation activity. Please try again.",
          );
          setErrorRequestKey(requestKey);
          setCompletedRequestKey(requestKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestKey, reservationId]);

  return (
    <section
      aria-labelledby="reservation-history-title"
      className="rounded-2xl bg-white p-5 sm:p-7"
    >
      <div>
        <h2
          id="reservation-history-title"
          className="font-display text-2xl text-ink"
        >
          {isAdmin ? "Reservation activity" : "Reservation updates"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? "A record of changes and actions on this reservation."
            : "Important updates about your stay, in order."}
        </p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Loading label="Loading reservation activity..." />
        ) : error ? (
          <div className="space-y-4">
            <ErrorState message={error} />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </Button>
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            message="Reservation changes and status updates will appear here."
          />
        ) : (
          <ol className="relative space-y-0 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-black/10">
            {history.map((entry) => {
              const oldValues = entry.oldValues ?? {};
              const newValues = entry.newValues ?? {};
              const changedFields =
                entry.action === "UPDATED"
                  ? Object.keys(newValues).filter(
                      (key) => key in oldValues && key !== "guestChanged",
                    )
                  : ["CONFIRMED", "CANCELLED", "COMPLETED"].includes(
                        entry.action,
                      )
                    ? ["status"]
                    : [];
              const createdFields =
                entry.action === "CREATED"
                  ? Object.keys(newValues)
                  : [];

              return (
                <li
                  key={entry.id}
                  className="relative flex gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <HistoryIcon action={entry.action} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-ink">
                          {actionTitles[entry.action]}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          {entry.description}
                        </p>
                      </div>
                      <time
                        dateTime={entry.createdAt}
                        className="shrink-0 text-xs text-muted"
                      >
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(entry.createdAt))}
                      </time>
                    </div>

                    {isAdmin && (
                      <p className="mt-2 text-sm text-muted">
                        Performed by:{" "}
                        <span className="font-medium text-ink">
                          {entry.actor
                            ? `${entry.actor.firstName} ${entry.actor.lastName}`
                            : "System"}
                        </span>
                        {entry.actor && (
                          <span className="ml-1">
                            ({entry.actor.role === "ADMIN" ? "Admin" : "Guest"})
                          </span>
                        )}
                      </p>
                    )}

                    {isAdmin && (
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          entry.visibility === "ADMIN_ONLY"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sage/10 text-sage-dark"
                        }`}
                      >
                        {entry.visibility === "ADMIN_ONLY"
                          ? "Admin only"
                          : "Guest visible"}
                      </span>
                    )}

                    {(changedFields.length > 0 || createdFields.length > 0) && (
                      <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-xl bg-cream/70 p-3 text-sm sm:grid-cols-2">
                        {[...changedFields, ...createdFields].map((key) => (
                          <div key={key} className="min-w-0">
                            <dt className="font-medium text-muted">
                              {formatHistoryLabel(key)}
                            </dt>
                            <dd className="mt-1 break-words text-ink">
                              {key in oldValues && (
                                <>
                                  {formatHistoryValue(key, oldValues[key])}{" "}
                                  <span
                                    aria-hidden="true"
                                    className="px-1 text-muted"
                                  >
                                    →
                                  </span>
                                </>
                              )}
                              {formatHistoryValue(key, newValues[key])}
                            </dd>
                          </div>
                        ))}
                        {newValues.guestChanged === true && (
                          <div className="min-w-0">
                            <dt className="font-medium text-muted">
                              Guest assignment
                            </dt>
                            <dd className="mt-1 text-ink">Updated</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
