import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import {
  createAdminReservation,
  getAdminReservations,
  updateAdminReservation,
  updateReservationStatus,
} from "../../services/reservation.service";
import type {
  AdminReservation,
  ReservationStatus,
} from "../../types/admin-reservation";
import ReservationStatusBadge from "../../components/ui/ReservationStatus";
import { formatCurrency } from "../../utils/format";
import { getAvailableRooms } from "../../services/room.service";
import { getUsers, type AdminUser } from "../../services/user.service";
import type { RoomListing } from "../../types";
import axios from "axios";
import { createPortal } from "react-dom";
import ConfirmCancelReservationModal from "../../components/ui/ConfirmCancelReservationModal";

const statusOptions: Array<"ALL" | ReservationStatus> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

const statusTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
};

const statusActionLabels: Record<ReservationStatus, string> = {
  PENDING: "Set as pending",
  CONFIRMED: "Confirm reservation",
  CANCELLED: "Cancel reservation",
  COMPLETED: "Mark as completed",
};

const pageSize = 10;

type ReservationFormErrors = Partial<
  Record<"guest" | "checkIn" | "checkOut" | "guests" | "room", string>
>;

type StatusMenu = {
  reservation: AdminReservation;
  actions: ReservationStatus[];
  top: number;
  left: number;
};

const getTodayDateInput = () => {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const getGuestName = (reservation: AdminReservation) =>
  `${reservation.user.firstName} ${reservation.user.lastName}`.trim();

export default function Reservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReservationStatus>(
    "ALL",
  );
  const [sortBy, setSortBy] = useState<"checkIn" | "createdAt">("checkIn");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingReservationId, setUpdatingReservationId] = useState<
    string | null
  >(null);
  const [reservationToCancel, setReservationToCancel] =
    useState<AdminReservation | null>(null);
  const [statusMenu, setStatusMenu] = useState<StatusMenu | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstStatusActionRef = useRef<HTMLButtonElement | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userLoadError, setUserLoadError] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<
    Pick<AdminUser, "id" | "firstName" | "lastName" | "email"> | null
  >(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [availableRooms, setAvailableRooms] = useState<RoomListing[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomLoadError, setRoomLoadError] = useState("");
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  const [formErrors, setFormErrors] = useState<ReservationFormErrors>({});
  const roomRequestId = useRef(0);
  const [editingReservation, setEditingReservation] =
    useState<AdminReservation | null>(null);

  const fetchReservations = async () => {
    const data = await getAdminReservations();
    setReservations(data);
  };

  const validStayDates =
    Boolean(checkIn && checkOut) &&
    checkIn >= getTodayDateInput() &&
    checkOut > checkIn;

  const loadAvailableRooms = async (
    nextCheckIn: string,
    nextCheckOut: string,
    excludeReservationId?: string,
    initialRoomId?: string,
  ) => {
    const requestId = ++roomRequestId.current;
    const isValid =
      Boolean(nextCheckIn && nextCheckOut) &&
      nextCheckIn >= getTodayDateInput() &&
      nextCheckOut > nextCheckIn;

    setAvailableRooms([]);
    setSelectedRoomId("");
    setRoomLoadError("");

    if (!(isCreateFormOpen || excludeReservationId) || !isValid) {
      setIsLoadingRooms(false);
      return;
    }

    setIsLoadingRooms(true);
    try {
      const roomData = await getAvailableRooms(
        nextCheckIn,
        nextCheckOut,
        excludeReservationId ?? editingReservation?.id,
      );
      if (requestId === roomRequestId.current) {
        const eligibleRooms = roomData.filter(
          (room) => room.status === "AVAILABLE",
        );
        setAvailableRooms(eligibleRooms);
        if (initialRoomId && eligibleRooms.some((room) => room.id === initialRoomId)) {
          setSelectedRoomId(initialRoomId);
        }
      }
    } catch {
      if (requestId === roomRequestId.current) {
        setRoomLoadError("Unable to load available rooms. Please try again.");
      }
    } finally {
      if (requestId === roomRequestId.current) {
        setIsLoadingRooms(false);
      }
    }
  };

  useEffect(() => {
    const loadReservations = async () => {
      try {
        await fetchReservations();
      } catch {
        setLoadError("Unable to load reservations.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadReservations();
  }, []);

  useEffect(() => {
    if (!statusMenu) {
      return;
    }

    firstStatusActionRef.current?.focus();

    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !statusMenuRef.current?.contains(target) &&
        !statusMenuButtonRef.current?.contains(target)
      ) {
        setStatusMenu(null);
        statusMenuButtonRef.current = null;
      }
    };

    const closeMenuOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStatusMenu(null);
        statusMenuButtonRef.current?.focus();
        statusMenuButtonRef.current = null;
      }
    };

    const closeMenuOnScroll = () => {
      setStatusMenu(null);
      statusMenuButtonRef.current = null;
    };

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnKeyDown);
    window.addEventListener("scroll", closeMenuOnScroll, true);
    window.addEventListener("resize", closeMenuOnScroll);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnKeyDown);
      window.removeEventListener("scroll", closeMenuOnScroll, true);
      window.removeEventListener("resize", closeMenuOnScroll);
    };
  }, [statusMenu]);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return reservations
      .filter((reservation) => {
        const matchesStatus =
          statusFilter === "ALL" || reservation.status === statusFilter;
        const matchesSearch =
          !normalizedSearch ||
          reservation.referenceId.toLowerCase().includes(normalizedSearch) ||
          getGuestName(reservation).toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort((first, second) => {
        const firstDate = new Date(first[sortBy]).getTime();
        const secondDate = new Date(second[sortBy]).getTime();

        return sortBy === "checkIn"
          ? firstDate - secondDate
          : secondDate - firstDate;
      });
  }, [reservations, searchTerm, sortBy, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReservations.length / pageSize),
  );
  const pageToDisplay = Math.min(currentPage, totalPages);
  const paginatedReservations = filteredReservations.slice(
    (pageToDisplay - 1) * pageSize,
    pageToDisplay * pageSize,
  );

  const handleStatusChange = async (
    reservation: AdminReservation,
    status: ReservationStatus,
  ): Promise<boolean> => {
    setUpdatingReservationId(reservation.id);
    setActionError("");
    setSuccessMessage("");

    try {
      const updatedReservation = await updateReservationStatus(
        reservation.id,
        status,
      );
      setReservations((currentReservations) =>
        currentReservations.map((currentReservation) =>
          currentReservation.id === reservation.id
            ? { ...currentReservation, status: updatedReservation.status }
            : currentReservation,
        ),
      );
      setSuccessMessage(
        `Reservation ${reservation.referenceId} was updated successfully.`,
      );
      try {
        await fetchReservations();
      } catch {
        setActionError(
          "Reservation status was updated, but the table could not be refreshed.",
        );
      }
      return true;
    } catch {
      setActionError("Unable to update reservation status.");
      return false;
    } finally {
      setUpdatingReservationId(null);
    }
  };

  const confirmReservationCancellation = async () => {
    if (!reservationToCancel) {
      return;
    }

    const cancelled = await handleStatusChange(
      reservationToCancel,
      "CANCELLED",
    );
    if (cancelled) {
      setReservationToCancel(null);
    }
  };

  const openStatusMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    reservation: AdminReservation,
  ) => {
    const actions = statusTransitions[reservation.status];
    if (actions.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = actions.length * 44 + 8;
    const left = Math.max(
      8,
      Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    const top =
      bounds.bottom + menuHeight + 8 <= window.innerHeight
        ? bounds.bottom + 4
        : Math.max(8, bounds.top - menuHeight - 4);

    statusMenuButtonRef.current = event.currentTarget;
    setStatusMenu({ reservation, actions, top, left });
  };

  const selectStatusAction = (
    reservation: AdminReservation,
    status: ReservationStatus,
  ) => {
    setStatusMenu(null);
    statusMenuButtonRef.current = null;

    if (status === "CANCELLED") {
      setActionError("");
      setReservationToCancel(reservation);
      return;
    }

    void handleStatusChange(reservation, status);
  };

  const openCreateForm = () => {
    setEditingReservation(null);
    setGuestSearch("");
    setSelectedUser(null);
    setCheckIn("");
    setCheckOut("");
    setGuestCount("1");
    setAvailableRooms([]);
    setSelectedRoomId("");
    setRoomLoadError("");
    setFormErrors({});
    setActionError("");
    setSuccessMessage("");
    setIsCreateFormOpen(true);
    setUserLoadError("");
    setIsLoadingUsers(true);
    void getUsers()
      .then(setUsers)
      .catch(() => setUserLoadError("Unable to load registered users."))
      .finally(() => setIsLoadingUsers(false));
  };

  const closeCreateForm = () => {
    if (isCreatingReservation) {
      return;
    }

    roomRequestId.current += 1;
    setIsLoadingRooms(false);
    setIsCreateFormOpen(false);
    setEditingReservation(null);
  };

  const openEditForm = (reservation: AdminReservation) => {
    if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
      return;
    }

    setEditingReservation(reservation);
    setGuestSearch("");
    setSelectedUser({
      id: reservation.user.id,
      firstName: reservation.user.firstName,
      lastName: reservation.user.lastName,
      email: reservation.user.email,
    });
    setCheckIn(reservation.checkIn.slice(0, 10));
    setCheckOut(reservation.checkOut.slice(0, 10));
    setGuestCount(String(reservation.guests));
    setAvailableRooms([]);
    setSelectedRoomId("");
    setRoomLoadError("");
    setFormErrors({});
    setActionError("");
    setSuccessMessage("");
    setIsCreateFormOpen(true);
    setIsLoadingRooms(false);
    void loadAvailableRooms(
      reservation.checkIn.slice(0, 10),
      reservation.checkOut.slice(0, 10),
      reservation.id,
      reservation.room.id,
    );
  };

  const matchingUsers = users.filter((user) => {
    const term = guestSearch.trim().toLowerCase();
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();

    return (
      term.length > 0 &&
      (fullName.includes(term) || user.email.toLowerCase().includes(term))
    );
  });

  const selectedRoom = availableRooms.find(
    (room) => room.id === selectedRoomId,
  );
  const parsedGuestCount = Number(guestCount);
  const numberOfNights =
    validStayDates && checkIn && checkOut
      ? Math.round(
          (new Date(`${checkOut}T00:00:00`).getTime() -
            new Date(`${checkIn}T00:00:00`).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : 0;
  const calculatedTotal = selectedRoom
    ? Number(selectedRoom.roomType.pricePerNight) * numberOfNights
    : 0;

  const handleSaveReservation = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextErrors: ReservationFormErrors = {};

    if (!selectedUser) {
      nextErrors.guest = "Select an existing registered user.";
    }
    if (!checkIn || checkIn < getTodayDateInput()) {
      nextErrors.checkIn = "Choose today or a future check-in date.";
    }
    if (!checkOut || !checkIn || checkOut <= checkIn) {
      nextErrors.checkOut = "Check-out must be after check-in.";
    }
    if (!Number.isInteger(parsedGuestCount) || parsedGuestCount < 1) {
      nextErrors.guests = "Enter a valid number of guests.";
    } else if (
      selectedRoom &&
      parsedGuestCount > selectedRoom.roomType.capacity
    ) {
      nextErrors.guests = `This room accommodates up to ${selectedRoom.roomType.capacity} guests.`;
    }
    if (!selectedRoom) {
      nextErrors.room = "Select an available room for the selected dates.";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedUser || !selectedRoom) {
      return;
    }

    setIsCreatingReservation(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const reservationInput = {
        userId: selectedUser.id,
        roomId: selectedRoom.id,
        checkIn,
        checkOut,
        guests: parsedGuestCount,
      };
      const savedReservation = editingReservation
        ? await updateAdminReservation(editingReservation.id, reservationInput)
        : await createAdminReservation(reservationInput);

      setIsCreateFormOpen(false);
      setEditingReservation(null);
      setSuccessMessage(
        editingReservation
          ? `Reservation ${savedReservation.referenceId} was updated successfully.`
          : `Reservation ${savedReservation.referenceId} was created successfully.`,
      );
      if (!editingReservation) {
        setCurrentPage(1);
      }

      try {
        await fetchReservations();
      } catch {
        setActionError(
          `Reservation ${savedReservation.referenceId} was saved, but the table could not be refreshed.`,
        );
      }
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setActionError(
        message ??
          `Unable to ${editingReservation ? "update" : "create"} the reservation. The room may no longer be available.`,
      );
    } finally {
      setIsCreatingReservation(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Reservations</h1>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        >
          Create Reservation
        </button>
      </div>

      {isCreateFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-reservation-title"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-cream p-5 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                  Admin workspace
                </p>
                <h2
                  id="create-reservation-title"
                  className="mt-2 font-display text-3xl"
                >
                  {editingReservation ? "Edit Reservation" : "Create Reservation"}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {editingReservation
                    ? "Update the guest, stay dates, room, or guest count."
                    : "Reservations can currently be created for registered users only."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateForm}
                disabled={isCreatingReservation}
                aria-label="Close create reservation form"
                className="rounded-lg px-3 py-2 text-muted hover:bg-white disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleSaveReservation}
              className="mt-6 space-y-5"
              noValidate
            >
              <fieldset className="rounded-2xl bg-white p-5">
                <legend className="px-1 font-display text-xl">Guest</legend>
                {selectedUser ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sage/20 bg-sage/5 p-4">
                    <div>
                      <p className="font-semibold">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <p className="text-sm text-muted">{selectedUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setGuestSearch("");
                      }}
                      className="text-sm font-semibold text-sage underline"
                    >
                      Change guest
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <label
                      htmlFor="reservation-guest-search"
                      className="text-sm font-medium"
                    >
                      Search by name or email
                    </label>
                    <input
                      id="reservation-guest-search"
                      type="search"
                      autoComplete="off"
                      value={guestSearch}
                      onChange={(event) => {
                        setGuestSearch(event.target.value);
                        setFormErrors((current) => ({
                          ...current,
                          guest: undefined,
                        }));
                      }}
                      placeholder="Enter a guest name or email"
                      className="mt-2 w-full rounded-xl border px-4 py-3"
                    />
                    {isLoadingUsers && (
                      <p className="mt-2 text-sm text-muted">
                        Loading registered users...
                      </p>
                    )}
                    {userLoadError && (
                      <p role="alert" className="mt-2 text-sm text-red-700">
                        {userLoadError}
                      </p>
                    )}
                    {guestSearch.trim() &&
                      !isLoadingUsers &&
                      !userLoadError && (
                        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border">
                          {matchingUsers.length > 0 ? (
                            matchingUsers.slice(0, 8).map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setGuestSearch("");
                                  setFormErrors((current) => ({
                                    ...current,
                                    guest: undefined,
                                  }));
                                }}
                                className="block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-cream focus-visible:bg-cream"
                              >
                                <span className="block font-medium">
                                  {user.firstName} {user.lastName}
                                </span>
                                <span className="block text-sm text-muted">
                                  {user.email}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-3 text-sm text-muted">
                              No matching registered users. Only users with an
                              existing account can be selected.
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                )}
                {formErrors.guest && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {formErrors.guest}
                  </p>
                )}
              </fieldset>

              <fieldset className="rounded-2xl bg-white p-5">
                <legend className="px-1 font-display text-xl">
                  Stay details
                </legend>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="reservation-check-in"
                      className="text-sm font-medium"
                    >
                      Check-in
                    </label>
                    <input
                      id="reservation-check-in"
                      type="date"
                      min={getTodayDateInput()}
                      value={checkIn}
                      onChange={(event) => {
                        const nextCheckIn = event.target.value;
                        setCheckIn(nextCheckIn);
                        void loadAvailableRooms(nextCheckIn, checkOut);
                        setFormErrors((current) => ({
                          ...current,
                          checkIn: undefined,
                          checkOut: undefined,
                          room: undefined,
                        }));
                      }}
                      className="mt-2 w-full rounded-xl border px-4 py-3"
                    />
                    {formErrors.checkIn && (
                      <p role="alert" className="mt-1 text-sm text-red-700">
                        {formErrors.checkIn}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="reservation-check-out"
                      className="text-sm font-medium"
                    >
                      Check-out
                    </label>
                    <input
                      id="reservation-check-out"
                      type="date"
                      min={checkIn || getTodayDateInput()}
                      value={checkOut}
                      onChange={(event) => {
                        const nextCheckOut = event.target.value;
                        setCheckOut(nextCheckOut);
                        void loadAvailableRooms(checkIn, nextCheckOut);
                        setFormErrors((current) => ({
                          ...current,
                          checkOut: undefined,
                          room: undefined,
                        }));
                      }}
                      className="mt-2 w-full rounded-xl border px-4 py-3"
                    />
                    {formErrors.checkOut && (
                      <p role="alert" className="mt-1 text-sm text-red-700">
                        {formErrors.checkOut}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="reservation-guests"
                    className="text-sm font-medium"
                  >
                    Number of guests
                  </label>
                  <input
                    id="reservation-guests"
                    type="number"
                    min="1"
                    step="1"
                    value={guestCount}
                    onChange={(event) => {
                      setGuestCount(event.target.value);
                      setFormErrors((current) => ({
                        ...current,
                        guests: undefined,
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border px-4 py-3 sm:max-w-xs"
                  />
                  {formErrors.guests && (
                    <p role="alert" className="mt-1 text-sm text-red-700">
                      {formErrors.guests}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="reservation-room"
                    className="text-sm font-medium"
                  >
                    Available room
                  </label>
                  <select
                    id="reservation-room"
                    value={selectedRoomId}
                    disabled={!validStayDates || isLoadingRooms}
                    onChange={(event) => {
                      setSelectedRoomId(event.target.value);
                      setFormErrors((current) => ({
                        ...current,
                        room: undefined,
                        guests: undefined,
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border px-4 py-3 disabled:bg-black/5"
                  >
                    <option value="">
                      {!validStayDates
                        ? "Choose valid dates first"
                        : isLoadingRooms
                          ? "Loading available rooms..."
                          : "Select an available room"}
                    </option>
                    {availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} · {room.roomType.name} · Up to{" "}
                        {room.roomType.capacity} ·{" "}
                        {formatCurrency(Number(room.roomType.pricePerNight))}
                        /night
                      </option>
                    ))}
                  </select>
                  {isLoadingRooms && (
                    <p className="mt-2 text-sm text-muted">
                      Checking rooms for these dates...
                    </p>
                  )}
                  {roomLoadError && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {roomLoadError}
                    </p>
                  )}
                  {validStayDates &&
                    !isLoadingRooms &&
                    !roomLoadError &&
                    availableRooms.length === 0 && (
                      <p className="mt-2 text-sm text-muted">
                        No available rooms match these dates.
                      </p>
                    )}
                  {formErrors.room && (
                    <p role="alert" className="mt-1 text-sm text-red-700">
                      {formErrors.room}
                    </p>
                  )}
                </div>
              </fieldset>

              <section
                aria-labelledby="reservation-summary-title"
                className="rounded-2xl border border-gold/30 bg-white p-5"
              >
                <h3
                  id="reservation-summary-title"
                  className="font-display text-xl"
                >
                  Reservation summary
                </h3>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Guest</dt>
                    <dd className="font-medium">
                      {selectedUser
                        ? `${selectedUser.firstName} ${selectedUser.lastName}`
                        : "Not selected"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Room</dt>
                    <dd className="font-medium">
                      {selectedRoom
                        ? `Room ${selectedRoom.roomNumber} · ${selectedRoom.roomType.name}`
                        : "Not selected"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Check-in / Check-out</dt>
                    <dd className="font-medium">
                      {checkIn && checkOut
                        ? `${formatDate(checkIn)} – ${formatDate(checkOut)}`
                        : "Not selected"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Number of nights</dt>
                    <dd className="font-medium">{numberOfNights}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Number of guests</dt>
                    <dd className="font-medium">{guestCount || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Price per night</dt>
                    <dd className="font-medium">
                      {selectedRoom
                        ? formatCurrency(
                            Number(selectedRoom.roomType.pricePerNight),
                          )
                        : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Estimated total</dt>
                    <dd className="mt-1 text-lg font-bold">
                      {selectedRoom ? formatCurrency(calculatedTotal) : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted">
                  Final total is calculated by the server using the current room
                  price.
                </p>
              </section>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={isCreatingReservation}
                  className="rounded-full border px-5 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingReservation}
                  className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingReservation
                    ? editingReservation
                      ? "Saving changes..."
                      : "Creating reservation..."
                    : editingReservation
                      ? "Save Changes"
                      : "Create Reservation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {isLoading && <Loading label="Loading reservations..." />}

        {loadError && <ErrorState message={loadError} />}

        {!isLoading && !loadError && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label
                  htmlFor="reservation-search"
                  className="text-sm font-medium"
                >
                  Search reservations
                </label>
                <input
                  id="reservation-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Reference ID or guest name"
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label
                  htmlFor="reservation-status-filter"
                  className="text-sm font-medium"
                >
                  Status
                </label>
                <select
                  id="reservation-status-filter"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value as "ALL" | ReservationStatus,
                    );
                    setCurrentPage(1);
                  }}
                  className="mt-2 w-full rounded-xl border px-4 py-3 md:w-44"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL" ? "All statuses" : status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reservation-sort"
                  className="text-sm font-medium"
                >
                  Sort by
                </label>
                <select
                  id="reservation-sort"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as "checkIn" | "createdAt");
                    setCurrentPage(1);
                  }}
                  className="mt-2 w-full rounded-xl border px-4 py-3 md:w-44"
                >
                  <option value="checkIn">Check-in date</option>
                  <option value="createdAt">Created date</option>
                </select>
              </div>
            </div>

            {actionError && <ErrorState message={actionError} />}

            {successMessage && (
              <p
                role="status"
                className="rounded-xl border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark"
              >
                {successMessage}
              </p>
            )}

            {filteredReservations.length === 0 ? (
              <EmptyState
                title={
                  reservations.length === 0
                    ? "No reservations"
                    : "No matching reservations"
                }
                message={
                  reservations.length === 0
                    ? "Reservations will appear here when guests make bookings."
                    : "Try adjusting your search or status filter."
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl bg-white">
                  <table className="w-full min-w-262.5 text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-4">No.</th>
                        <th className="px-6 py-4">Reference ID</th>
                        <th className="px-6 py-4">Guest</th>
                        <th className="px-6 py-4">Room</th>
                        <th className="px-6 py-4">Check-in / Check-out</th>
                        <th className="px-6 py-4">Guests</th>
                        <th className="px-6 py-4">Total Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedReservations.map((reservation, index) => {
                        const isUpdating =
                          updatingReservationId === reservation.id;
                        const availableTransitions =
                          statusTransitions[reservation.status];

                        return (
                          <tr
                            key={reservation.id}
                            className="border-b last:border-b-0"
                          >
                            <td className="whitespace-nowrap px-6 py-4">
                              {(pageToDisplay - 1) * pageSize + index + 1}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4 font-semibold">
                              {reservation.referenceId}
                            </td>

                            <td className="px-6 py-4">
                              {getGuestName(reservation)}
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              <p className="font-semibold">
                                Room {reservation.room.roomNumber}
                              </p>
                              <p className="mt-1 text-muted">
                                {reservation.room.roomType.name}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-6 py-4">
                              <p>{formatDate(reservation.checkIn)}</p>
                              <p className="mt-1 text-muted">
                                -{formatDate(reservation.checkOut)}
                              </p>
                            </td>

                            <td className="px-6 py-4">{reservation.guests}</td>

                            <td className="whitespace-nowrap px-6 py-4 font-semibold">
                              {formatCurrency(Number(reservation.totalAmount))}
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <ReservationStatusBadge
                                  status={reservation.status}
                                />
                                {availableTransitions.length > 0 && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    aria-label={`Status actions for reservation ${reservation.referenceId}`}
                                    aria-haspopup="menu"
                                    aria-expanded={
                                      statusMenu?.reservation.id ===
                                      reservation.id
                                    }
                                    aria-controls={
                                      statusMenu?.reservation.id ===
                                      reservation.id
                                        ? "reservation-status-menu"
                                        : undefined
                                    }
                                    onClick={(event) => {
                                      if (
                                        statusMenu?.reservation.id ===
                                        reservation.id
                                      ) {
                                        setStatusMenu(null);
                                        statusMenuButtonRef.current = null;
                                        return;
                                      }
                                      openStatusMenu(event, reservation);
                                    }}
                                    className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <svg
                                      aria-hidden="true"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="size-5"
                                    >
                                      <circle cx="5" cy="12" r="1.8" />
                                      <circle cx="12" cy="12" r="1.8" />
                                      <circle cx="19" cy="12" r="1.8" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              {(reservation.status === "PENDING" ||
                                reservation.status === "CONFIRMED") && (
                                <button
                                  type="button"
                                  disabled={isUpdating || isCreatingReservation}
                                  onClick={() => openEditForm(reservation)}
                                  className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 text-sm">
                    <p className="text-muted">
                      Page {pageToDisplay} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pageToDisplay === 1}
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                        className="rounded-xl border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={pageToDisplay === totalPages}
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                        className="rounded-xl border px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {statusMenu &&
        createPortal(
          <div
            id="reservation-status-menu"
            ref={statusMenuRef}
            role="menu"
            aria-label={`Status actions for reservation ${statusMenu.reservation.referenceId}`}
            className="fixed z-60 min-w-56 rounded-xl border border-black/10 bg-white p-1.5 shadow-xl"
            style={{ top: statusMenu.top, left: statusMenu.left }}
          >
            {statusMenu.actions.map((status, index) => (
              <button
                key={status}
                ref={index === 0 ? firstStatusActionRef : undefined}
                type="button"
                role="menuitem"
                onClick={() =>
                  selectStatusAction(statusMenu.reservation, status)
                }
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-cream focus-visible:bg-cream focus-visible:outline-none ${
                  status === "CANCELLED"
                    ? "text-red-700 hover:text-red-800"
                    : "text-ink"
                }`}
              >
                {statusActionLabels[status]}
              </button>
            ))}
          </div>,
          document.body,
        )}
      <ConfirmCancelReservationModal
        isOpen={reservationToCancel !== null}
        referenceId={reservationToCancel?.referenceId ?? ""}
        isCancelling={
          reservationToCancel !== null &&
          updatingReservationId === reservationToCancel.id
        }
        error={actionError}
        onCancel={() => setReservationToCancel(null)}
        onConfirm={() => void confirmReservationCancellation()}
      />
    </div>
  );
}
