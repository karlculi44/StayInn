import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { ErrorState, Loading } from "./States";
import {
  getReservationRequests,
  reviewReservationRequest,
} from "../../services/reservation.service";
import type { AdminReservation } from "../../types/admin-reservation";
import type {
  ReservationRequest,
  ReservationRequestValues,
} from "../../types/reservation-request";

type Props = {
  reservation: AdminReservation;
  onChanged: () => Promise<void>;
};

const formatDate = (value: unknown) =>
  typeof value === "string"
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
    : "—";

function Values({ values, reservation }: {
  values: ReservationRequestValues;
  reservation: AdminReservation;
}) {
  const room =
    values.roomId === reservation.room.id
      ? `Room ${reservation.room.roomNumber} · ${reservation.room.roomType.name}`
      : values.roomId ?? "—";

  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted">Room</dt>
        <dd className="mt-1 font-medium">{room}</dd>
      </div>
      <div>
        <dt className="text-muted">Guests</dt>
        <dd className="mt-1 font-medium">{values.guests ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted">Check-in</dt>
        <dd className="mt-1 font-medium">{formatDate(values.checkIn)}</dd>
      </div>
      <div>
        <dt className="text-muted">Check-out</dt>
        <dd className="mt-1 font-medium">{formatDate(values.checkOut)}</dd>
      </div>
      {values.totalAmount && (
        <div>
          <dt className="text-muted">Total amount at submission</dt>
          <dd className="mt-1 font-medium">{values.totalAmount}</dd>
        </div>
      )}
    </dl>
  );
}

export default function AdminReservationRequests({
  reservation,
  onChanged,
}: Props) {
  const [loadedRequests, setLoadedRequests] = useState<{
    key: string;
    requests: ReservationRequest[];
    error: string;
  } | null>(null);
  const [selected, setSelected] = useState<{
    request: ReservationRequest;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const loadRequestId = useRef(0);

  const requestKey = `${reservation.id}:${reservation.updatedAt}`;
  const loadRequests = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    try {
      const loaded = await getReservationRequests(reservation.id);
      if (requestId === loadRequestId.current) {
        setLoadedRequests({ key: requestKey, requests: loaded, error: "" });
      }
    } catch {
      if (requestId === loadRequestId.current) {
        setLoadedRequests({
          key: requestKey,
          requests: [],
          error: "Unable to load reservation requests.",
        });
      }
    }
  }, [requestKey, reservation.id]);

  useEffect(() => {
    const requestId = ++loadRequestId.current;
    void getReservationRequests(reservation.id)
      .then((loaded) => {
        if (requestId === loadRequestId.current) {
          setLoadedRequests({ key: requestKey, requests: loaded, error: "" });
        }
      })
      .catch(() => {
        if (requestId === loadRequestId.current) {
          setLoadedRequests({
            key: requestKey,
            requests: [],
            error: "Unable to load reservation requests.",
          });
        }
      });

    return () => {
      if (requestId === loadRequestId.current) {
        loadRequestId.current += 1;
      }
    };
  }, [requestKey, reservation.id]);

  const isLoading = loadedRequests?.key !== requestKey;
  const requests =
    loadedRequests?.key === requestKey ? loadedRequests.requests : [];
  const loadError =
    loadedRequests?.key === requestKey ? loadedRequests.error : "";

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || isReviewing || !reviewReason.trim()) {
      return;
    }
    setIsReviewing(true);
    setReviewError("");
    try {
      await reviewReservationRequest(
        selected.request.id,
        selected.decision,
        reviewReason.trim(),
      );
      await loadRequests();
      await onChanged();
      setSelected(null);
      setReviewReason("");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Unable to review this request.";
      setReviewError(message);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 sm:p-7">
      <div>
        <h2 className="font-display text-2xl">Reservation requests</h2>
        <p className="mt-1 text-sm text-muted">
          Review guest-requested changes and cancellations here.
        </p>
      </div>
      {isLoading && <Loading label="Loading reservation requests..." />}
      {!isLoading && loadError && (
        <div className="space-y-3">
          <ErrorState message={loadError} />
          <Button type="button" variant="secondary" onClick={() => void loadRequests()}>
            Try again
          </Button>
        </div>
      )}
      {!isLoading && !loadError && requests.length === 0 && (
        <p className="text-sm text-muted">There are no reservation requests.</p>
      )}
      {!isLoading && !loadError && requests.length > 0 && (
        <ul className="divide-y divide-black/10 border-y border-black/10">
          {requests.map((request) => (
            <li key={request.id} className="space-y-4 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {request.type === "EDIT" ? "Edit request" : "Cancellation request"}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {request.guest
                      ? `${request.guest.firstName} ${request.guest.lastName}`
                      : "Deleted guest"}{" "}
                    · Reservation {reservation.referenceId} · Submitted{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(request.createdAt))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    request.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : request.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {request.status.toLowerCase()}
                </span>
              </div>
              <p className="text-sm">
                <span className="font-semibold">Guest reason:</span> {request.reason}
              </p>
              {request.type === "EDIT" && request.proposedChanges && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-cream/70 p-4">
                    <h4 className="mb-3 text-sm font-semibold">Original values</h4>
                    <Values values={request.originalValues} reservation={reservation} />
                  </div>
                  <div className="rounded-xl bg-sage/10 p-4">
                    <h4 className="mb-3 text-sm font-semibold">Proposed values</h4>
                    <Values values={request.proposedChanges} reservation={reservation} />
                  </div>
                </div>
              )}
              {request.reviewReason && (
                <p className="rounded-xl bg-cream/70 p-3 text-sm">
                  <span className="font-semibold">
                    {request.reviewer
                      ? `Reviewed by ${request.reviewer.firstName} ${request.reviewer.lastName}:`
                      : "Review reason:"}
                  </span>{" "}
                  {request.reviewReason}
                </p>
              )}
              {request.status === "PENDING" && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setReviewReason("");
                      setReviewError("");
                      setSelected({ request, decision: "APPROVED" });
                    }}
                  >
                    Approve request
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setReviewReason("");
                      setReviewError("");
                      setSelected({ request, decision: "REJECTED" });
                    }}
                  >
                    Reject request
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isReviewing) {
              setSelected(null);
            }
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-review-title"
            onSubmit={(event) => void submitReview(event)}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="request-review-title" className="font-display text-2xl">
              {selected.decision === "APPROVED" ? "Approve" : "Reject"} request
            </h2>
            <label className="block text-sm font-medium">
              Review reason
              <textarea
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
                maxLength={1000}
                rows={4}
                required
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            {reviewError && (
              <p role="alert" className="text-sm text-red-700">
                {reviewError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
                disabled={isReviewing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isReviewing || !reviewReason.trim()}>
                {isReviewing ? "Saving..." : `${selected.decision === "APPROVED" ? "Approve" : "Reject"} request`}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
