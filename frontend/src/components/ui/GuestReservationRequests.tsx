import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { ErrorState, Loading } from "./States";
import {
  getReservationRequests,
  submitReservationRequest,
} from "../../services/reservation.service";
import type { Reservation } from "../../types/reservation";
import type { ReservationRequest } from "../../types/reservation-request";

type Props = {
  reservation: Reservation;
  onChanged: () => void;
};

const formatDate = (value: string | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`))
    : "—";

const statusClass: Record<ReservationRequest["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function GuestReservationRequests({
  reservation,
  onChanged,
}: Props) {
  const [loadedRequests, setLoadedRequests] = useState<{
    key: string;
    requests: ReservationRequest[];
    error: string;
  } | null>(null);
  const [modalType, setModalType] = useState<"EDIT" | "CANCELLATION" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [checkIn, setCheckIn] = useState(reservation.checkIn.slice(0, 10));
  const [checkOut, setCheckOut] = useState(reservation.checkOut.slice(0, 10));
  const [guests, setGuests] = useState(String(reservation.guests));
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const pendingRequest = requests.find((request) => request.status === "PENDING");
  const closeModal = () => {
    setModalType(null);
    setSubmitError("");
    setReason("");
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modalType || isSubmitting) {
      return;
    }
    if (modalType === "EDIT" && checkOut <= checkIn) {
      setSubmitError("Check-out must be after check-in.");
      return;
    }
    const guestCount = Number(guests);
    if (
      modalType === "EDIT" &&
      (!Number.isInteger(guestCount) ||
        guestCount < 1 ||
        guestCount > reservation.room.roomType.capacity)
    ) {
      setSubmitError(
        `Enter a guest count from 1 to ${reservation.room.roomType.capacity}.`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSuccess("");
    try {
      await submitReservationRequest(
        reservation.id,
        modalType === "EDIT"
          ? {
              type: "EDIT",
              reason: reason.trim(),
              proposedChanges: {
                roomId: reservation.room.id,
                checkIn,
                checkOut,
                guests: guestCount,
              },
            }
          : { type: "CANCELLATION", reason: reason.trim() },
      );
      await loadRequests();
      onChanged();
      setSuccess(
        modalType === "EDIT"
          ? "Your edit request was sent to the StayInn team."
          : "Your cancellation request was sent to the StayInn team.",
      );
      closeModal();
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
          : "Unable to submit your request. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    reservation.status !== "CONFIRMED" &&
    !isLoading &&
    !requests.length &&
    !loadError
  ) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Reservation requests</h2>
          {reservation.status === "CONFIRMED" && (
            <p className="mt-1 text-sm text-muted">
              Confirmed reservations can only be changed after review.
            </p>
          )}
        </div>
        {reservation.status === "CONFIRMED" && !pendingRequest && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCheckIn(reservation.checkIn.slice(0, 10));
                setCheckOut(reservation.checkOut.slice(0, 10));
                setGuests(String(reservation.guests));
                setModalType("EDIT");
              }}
            >
              Request edit
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalType("CANCELLATION")}
            >
              Request cancellation
            </Button>
          </div>
        )}
      </div>

      {success && (
        <p role="status" className="text-sm font-medium text-sage">
          {success}
        </p>
      )}
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
            <li key={request.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {request.type === "EDIT" ? "Edit request" : "Cancellation request"}
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[request.status]}`}
                >
                  {request.status.toLowerCase()}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Submitted{" "}
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(request.createdAt))}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Your reason:</span> {request.reason}
              </p>
              {request.type === "EDIT" && request.proposedChanges && (
                <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-xl bg-cream/70 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Requested check-in</dt>
                    <dd className="font-medium">
                      {formatDate(request.proposedChanges.checkIn)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Requested check-out</dt>
                    <dd className="font-medium">
                      {formatDate(request.proposedChanges.checkOut)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Requested guests</dt>
                    <dd className="font-medium">{request.proposedChanges.guests}</dd>
                  </div>
                </dl>
              )}
              {request.reviewReason && (
                <p className="mt-3 rounded-xl bg-cream/70 p-3 text-sm">
                  <span className="font-semibold">StayInn response:</span>{" "}
                  {request.reviewReason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {modalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeModal();
            }
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-request-title"
            onSubmit={(event) => void submitRequest(event)}
            className="max-h-full w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="reservation-request-title" className="font-display text-2xl">
              {modalType === "EDIT" ? "Request reservation changes" : "Request cancellation"}
            </h2>
            <p className="text-sm leading-6 text-muted">
              {modalType === "EDIT"
                ? "Your confirmed reservation will stay unchanged until an administrator reviews this request."
                : "Your confirmed reservation remains active until an administrator reviews this request."}
            </p>
            {modalType === "EDIT" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Check-in
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>
                <label className="text-sm font-medium">
                  Check-out
                  <input
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Guests
                  <input
                    type="number"
                    min={1}
                    max={reservation.room.roomType.capacity}
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>
              </div>
            )}
            <label className="block text-sm font-medium">
              {modalType === "EDIT" ? "Reason for requested changes" : "Reason for cancellation"}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={1000}
                rows={4}
                required
                className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3"
              />
            </label>
            {submitError && (
              <p role="alert" className="text-sm text-red-700">
                {submitError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit request"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
