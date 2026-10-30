import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import ConfirmCancelReservationModal from "../../components/ui/ConfirmCancelReservationModal";
import ReservationStatusBadge from "../../components/ui/ReservationStatus";
import ReservationHistoryTimeline from "../../components/ui/ReservationHistoryTimeline";
import { ErrorState, Loading } from "../../components/ui/States";
import {
  getAdminReservation,
  updateAdminReservation,
  updateReservationStatus,
} from "../../services/reservation.service";
import { getAvailableRooms } from "../../services/room.service";
import { getGuestUsers, type AdminUser } from "../../services/user.service";
import type { RoomListing } from "../../types";
import type {
  AdminReservation,
  ReservationStatus,
} from "../../types/admin-reservation";
import { formatCurrency } from "../../utils/format";
import {
  adminRaisedDark,
  adminRaisedLight,
} from "../../components/ui/adminButtonStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const statusTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const getLocalDateInput = () => {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};

const getGuestName = (reservation: AdminReservation) =>
  reservation.user
    ? `${reservation.user.firstName} ${reservation.user.lastName}`.trim()
    : "Deleted user";

const getErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return "Unable to complete the reservation update.";
  }

  const responseMessage = (
    error.response?.data as { message?: string } | undefined
  )?.message;
  if (
    error.response?.status === 409 ||
    responseMessage?.toLowerCase().includes("available") ||
    responseMessage?.toLowerCase().includes("overlap")
  ) {
    return "The selected dates are not available.";
  }

  return responseMessage ?? "Unable to complete the reservation update.";
};

export default function ReservationDetails() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const location = useLocation();
  const navigationState = location.state as
    | { from?: unknown; reservationListState?: unknown }
    | null;
  const [reservationResult, setReservationResult] = useState<{
    id: string;
    reservation?: AdminReservation;
    error?: string;
  } | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelReservationId, setCancelReservationId] = useState<string | null>(
    null,
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [isLoadingGuests, setIsLoadingGuests] = useState(false);
  const [guestError, setGuestError] = useState("");
  const roomRequestId = useRef(0);

  useEffect(() => {
    let isMounted = true;
    if (reservationId) {
      void getAdminReservation(reservationId)
        .then((data) => {
          if (isMounted) {
            setReservationResult({ id: reservationId, reservation: data });
          }
        })
        .catch((error: unknown) => {
          if (isMounted) {
            setReservationResult({
              id: reservationId,
              error:
                axios.isAxiosError(error) && error.response?.status === 404
                  ? "Reservation not found."
                  : "Unable to load this reservation.",
            });
          }
        });
    }

    return () => {
      isMounted = false;
      roomRequestId.current += 1;
    };
  }, [reservationId]);

  const reservation =
    reservationResult?.id === reservationId
      ? reservationResult?.reservation ?? null
      : null;
  const isLoading = reservationResult?.id !== reservationId;
  const loadError =
    reservationResult?.id === reservationId
      ? reservationResult?.error ?? ""
      : "";
  const isEditing = editingReservationId === reservationId;
  const isCancelOpen = cancelReservationId === reservationId;

  const loadAvailableRooms = async (
    nextCheckIn: string,
    nextCheckOut: string,
    reservationIdToExclude: string,
    initialRoomId?: string,
  ) => {
    const requestId = ++roomRequestId.current;
    const datesAreValid =
      nextCheckIn >= getLocalDateInput() && nextCheckOut > nextCheckIn;
    setRooms([]);
    setSelectedRoomId("");
    setRoomError("");

    if (!datesAreValid) {
      setIsLoadingRooms(false);
      return;
    }

    setIsLoadingRooms(true);
    try {
      const data = await getAvailableRooms(
        nextCheckIn,
        nextCheckOut,
        reservationIdToExclude,
      );
      if (requestId === roomRequestId.current) {
        const availableRooms = data.filter(
          (room) => room.status === "AVAILABLE",
        );
        setRooms(availableRooms);
        setSelectedRoomId(
          initialRoomId &&
            availableRooms.some((room) => room.id === initialRoomId)
            ? initialRoomId
            : "",
        );
      }
    } catch {
      if (requestId === roomRequestId.current) {
        setRoomError("Unable to load available rooms. Please try again.");
      }
    } finally {
      if (requestId === roomRequestId.current) {
        setIsLoadingRooms(false);
      }
    }
  };

  const matchingUsers = useMemo(() => {
    const term = guestSearch.trim().toLowerCase();
    if (!term) {
      return [];
    }

    return users.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [guestSearch, users]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.round(
          (new Date(`${checkOut}T00:00:00`).getTime() -
            new Date(`${checkIn}T00:00:00`).getTime()) /
            86_400_000,
        )
      : 0;
  const editable =
    reservation?.status === "PENDING" || reservation?.status === "CONFIRMED";

  const startEditing = async () => {
    if (!reservation) {
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setGuestError("");
    setIsLoadingGuests(true);
    setEditingReservationId(reservation.id);
    setSelectedUserId(reservation.user?.id ?? "");
    setCheckIn(reservation.checkIn.slice(0, 10));
    setCheckOut(reservation.checkOut.slice(0, 10));
    setGuestCount(String(reservation.guests));
    setSelectedRoomId(reservation.room.id);
    void loadAvailableRooms(
      reservation.checkIn.slice(0, 10),
      reservation.checkOut.slice(0, 10),
      reservation.id,
      reservation.room.id,
    );

    try {
      setUsers(await getGuestUsers());
    } catch {
      setGuestError("Unable to load registered guests. Please try again.");
    } finally {
      setIsLoadingGuests(false);
    }
  };

  const refreshReservation = async () => {
    if (!reservationId) {
      return;
    }
    setReservationResult({
      id: reservationId,
      reservation: await getAdminReservation(reservationId),
    });
  };

  const saveReservation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reservation || !selectedUserId || !selectedRoomId) {
      setActionError("Select a guest and an available room.");
      return;
    }
    if (checkIn < getLocalDateInput() || !checkOut || checkOut <= checkIn) {
      setActionError("Choose valid check-in and check-out dates.");
      return;
    }
    const guests = Number(guestCount);
    if (!Number.isInteger(guests) || guests < 1) {
      setActionError("Enter a valid number of guests.");
      return;
    }
    if (selectedRoom && guests > selectedRoom.roomType.capacity) {
      setActionError(
        `This room accommodates up to ${selectedRoom.roomType.capacity} guests.`,
      );
      return;
    }

    setIsSaving(true);
    setActionError("");
    setSuccessMessage("");
    try {
      const updatedReservation = await updateAdminReservation(reservation.id, {
        userId: selectedUserId,
        roomId: selectedRoomId,
        checkIn,
        checkOut,
        guests,
      });
      setReservationResult({
        id: reservation.id,
        reservation: updatedReservation,
      });
      setEditingReservationId(null);
      setSuccessMessage(
        `Reservation ${updatedReservation.referenceId} was updated successfully.`,
      );
    } catch (error: unknown) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (status: ReservationStatus) => {
    if (!reservation) {
      return;
    }
    setIsUpdatingStatus(true);
    setActionError("");
    setSuccessMessage("");
    try {
      await updateReservationStatus(reservation.id, status);
      await refreshReservation();
      setCancelReservationId(null);
      setCancelError("");
      setSuccessMessage(
        `Reservation ${reservation.referenceId} was updated successfully.`,
      );
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      const statusError = message ?? "Unable to update reservation status.";
      setActionError(statusError);
      setCancelError(statusError);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const backPath =
    typeof navigationState?.from === "string"
      ? navigationState.from
      : "/admin/reservations";

  return (
    <div className="space-y-6">
      <Link
        to={backPath}
        state={
          navigationState?.reservationListState
            ? {
                reservationListState:
                  navigationState.reservationListState,
              }
            : undefined
        }
        className="inline-flex rounded-lg text-sm font-semibold text-sage underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
      >
        Back to reservations
      </Link>

      {isLoading ? (
        <Loading label="Loading reservation..." />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : reservation ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                Admin workspace
              </p>
              <h1 className="mt-2 font-display text-4xl">
                Reservation {reservation.referenceId}
              </h1>
              <div className="mt-3">
                <ReservationStatusBadge status={reservation.status} />
              </div>
            </div>
            {editable && !isEditing && (
              <button
                type="button"
                onClick={() => void startEditing()}
                className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedDark}`}
              >
                Edit reservation
              </button>
            )}
          </header>

          {actionError && <ErrorState message={actionError} />}
          {successMessage && (
            <p
              role="status"
              className="rounded-xl border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark"
            >
              {successMessage}
            </p>
          )}

          {isEditing ? (
            <form
              onSubmit={(event) => void saveReservation(event)}
              className="space-y-5 rounded-2xl bg-white p-5 sm:p-7"
            >
              <h2 className="font-display text-2xl">Edit reservation</h2>
              <div>
                <label htmlFor="details-guest-search" className="text-sm font-medium">
                  Guest
                </label>
                <p className="mt-1 text-sm text-muted">
                  Current guest: {getGuestName(reservation)}
                </p>
                <input
                  id="details-guest-search"
                  type="search"
                  value={guestSearch}
                  onChange={(event) => setGuestSearch(event.target.value)}
                  placeholder="Search registered guests by name or email"
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
                {isLoadingGuests && (
                  <p className="mt-2 text-sm text-muted">Loading guests...</p>
                )}
                {guestError && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {guestError}
                  </p>
                )}
                {guestSearch.trim() && !isLoadingGuests && !guestError && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border">
                    {matchingUsers.length ? (
                      matchingUsers.slice(0, 8).map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setGuestSearch("");
                          }}
                          className="block w-full px-4 py-3 text-left hover:bg-cream"
                        >
                          <span className="block font-semibold">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-sm text-muted">{user.email}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-muted">
                        No registered guests found.
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-2 text-sm text-muted">
                  Selected guest:{" "}
                  {users.find((user) => user.id === selectedUserId)
                    ? `${users.find((user) => user.id === selectedUserId)?.firstName} ${users.find((user) => user.id === selectedUserId)?.lastName}`
                    : getGuestName(reservation)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="details-check-in" className="text-sm font-medium">
                    Check-in
                  </label>
                  <input
                    id="details-check-in"
                    type="date"
                    min={getLocalDateInput()}
                    value={checkIn}
                    onChange={(event) => {
                      const nextCheckIn = event.target.value;
                      setCheckIn(nextCheckIn);
                      void loadAvailableRooms(
                        nextCheckIn,
                        checkOut,
                        reservation.id,
                      );
                    }}
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </div>
                <div>
                  <label htmlFor="details-check-out" className="text-sm font-medium">
                    Check-out
                  </label>
                  <input
                    id="details-check-out"
                    type="date"
                    min={checkIn || getLocalDateInput()}
                    value={checkOut}
                    onChange={(event) => {
                      const nextCheckOut = event.target.value;
                      setCheckOut(nextCheckOut);
                      void loadAvailableRooms(
                        checkIn,
                        nextCheckOut,
                        reservation.id,
                      );
                    }}
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="details-room" className="text-sm font-medium">
                    Available room
                  </label>
                  <Select
                    value={selectedRoomId || "__none__"}
                    onValueChange={(value) =>
                      setSelectedRoomId(value === "__none__" ? "" : value)
                    }
                    disabled={isLoadingRooms}
                  >
                    <SelectTrigger id="details-room" className="mt-2">
                      <SelectValue
                        placeholder={
                          isLoadingRooms
                            ? "Loading available rooms..."
                            : "Select an available room"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {isLoadingRooms
                          ? "Loading available rooms..."
                          : "Select an available room"}
                      </SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.roomNumber} · {room.roomType.name} · Up to{" "}
                          {room.roomType.capacity} guests
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roomError && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {roomError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="details-guests" className="text-sm font-medium">
                    Number of guests
                  </label>
                  <input
                    id="details-guests"
                    type="number"
                    min="1"
                    step="1"
                    value={guestCount}
                    onChange={(event) => setGuestCount(event.target.value)}
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>
              <p className="text-sm text-muted">
                {nights} night{nights === 1 ? "" : "s"} · Final price is
                calculated by the server.
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReservationId(null)}
                  disabled={isSaving}
                  className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedLight}`}
                >
                  Discard changes
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isLoadingRooms || isLoadingGuests}
                  className={`rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 ${adminRaisedDark}`}
                >
                  {isSaving ? "Saving changes..." : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl bg-white p-5 sm:p-7">
                <h2 className="font-display text-2xl">Guest</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-muted">Name</dt>
                    <dd className="mt-1 font-semibold">{getGuestName(reservation)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Email</dt>
                    <dd className="mt-1 font-semibold">
                      {reservation.user?.email ?? "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Number of guests</dt>
                    <dd className="mt-1 font-semibold">{reservation.guests}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl bg-white p-5 sm:p-7">
                <h2 className="font-display text-2xl">Stay</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-muted">Room</dt>
                    <dd className="mt-1 font-semibold">
                      Room {reservation.room.roomNumber} ·{" "}
                      {reservation.room.roomType.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Check-in</dt>
                    <dd className="mt-1 font-semibold">
                      {formatDate(reservation.checkIn)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Check-out</dt>
                    <dd className="mt-1 font-semibold">
                      {formatDate(reservation.checkOut)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Number of nights</dt>
                    <dd className="mt-1 font-semibold">
                      {Math.round(
                        (new Date(`${reservation.checkOut.slice(0, 10)}T00:00:00Z`).getTime() -
                          new Date(`${reservation.checkIn.slice(0, 10)}T00:00:00Z`).getTime()) /
                          86_400_000,
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl bg-white p-5 sm:p-7">
                <h2 className="font-display text-2xl">Payment</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-muted">Total amount</dt>
                    <dd className="mt-1 text-xl font-bold">
                      {formatCurrency(Number(reservation.totalAmount))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Created</dt>
                    <dd className="mt-1 font-semibold">
                      {formatDateTime(reservation.createdAt)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl bg-white p-5 sm:p-7">
                <h2 className="font-display text-2xl">Manage reservation</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  {statusTransitions[reservation.status].map((status) =>
                    status === "CANCELLED" ? (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setCancelError("");
                          setCancelReservationId(reservation.id);
                        }}
                        disabled={isUpdatingStatus}
                        className="rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Cancel reservation
                      </button>
                    ) : (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void changeStatus(status)}
                        disabled={isUpdatingStatus}
                        className={`rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 ${adminRaisedDark}`}
                      >
                        {status === "CONFIRMED"
                          ? "Confirm reservation"
                          : "Mark as completed"}
                      </button>
                    ),
                  )}
                  {statusTransitions[reservation.status].length === 0 && (
                    <p className="text-sm text-muted">
                      This reservation has no further status actions.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
          <ConfirmCancelReservationModal
            isOpen={isCancelOpen}
            referenceId={reservation.referenceId}
            isCancelling={isUpdatingStatus}
            error={cancelError}
            onCancel={() => setCancelReservationId(null)}
            onConfirm={() => void changeStatus("CANCELLED")}
          />
          {reservation && !isEditing && (
            <ReservationHistoryTimeline
              reservationId={reservation.id}
              isAdmin
              refreshKey={reservation.updatedAt}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
