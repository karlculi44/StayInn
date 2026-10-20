import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createRoom,
  deleteRoom,
  getAllRoomsForAdmin,
  updateRoom,
  updateRoomStatus,
} from "../../services/room.service";
import { getRoomTypes } from "../../services/room-type.service";
import { ErrorState } from "../../components/ui/States";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import type { RoomListing } from "../../types";
import { getRoomTypeImage } from "../../utils/room-image";

type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";

type RoomType = {
  id: string;
  name: string;
};

type RoomActionsMenu = {
  room: RoomListing;
  top: number;
  left: number;
};

const roomStatusStyles: Record<RoomStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export default function Rooms() {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");
  const [capacityFilter, setCapacityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RoomStatus>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("AVAILABLE");
  const [statusReason, setStatusReason] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<RoomListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionsMenu, setActionsMenu] = useState<RoomActionsMenu | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await getAllRoomsForAdmin();
        setRooms(data);
      } catch {
        setError("Unable to load rooms.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const data = await getRoomTypes();
        setRoomTypes(data);
      } catch {
        setFormError("Unable to load room types.");
      }
    };

    fetchRoomTypes();
  }, []);

  useEffect(() => {
    if (!actionsMenu) {
      return;
    }

    firstMenuActionRef.current?.focus();

    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !actionsMenuRef.current?.contains(target) &&
        !actionsMenuButtonRef.current?.contains(target)
      ) {
        setActionsMenu(null);
        actionsMenuButtonRef.current = null;
      }
    };

    const closeMenuOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsMenu(null);
        actionsMenuButtonRef.current?.focus();
        actionsMenuButtonRef.current = null;
      }
    };

    const closeMenuOnViewportChange = () => {
      setActionsMenu(null);
      actionsMenuButtonRef.current = null;
    };

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnKeyDown);
    window.addEventListener("scroll", closeMenuOnViewportChange, true);
    window.addEventListener("resize", closeMenuOnViewportChange);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnKeyDown);
      window.removeEventListener("scroll", closeMenuOnViewportChange, true);
      window.removeEventListener("resize", closeMenuOnViewportChange);
    };
  }, [actionsMenu]);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        !normalizedSearch ||
        room.roomNumber.toLowerCase().includes(normalizedSearch);
      const matchesRoomType =
        roomTypeFilter === "ALL" || room.roomType.id === roomTypeFilter;
      const matchesCapacity =
        capacityFilter === "ALL" ||
        room.roomType.capacity === Number(capacityFilter);
      const matchesStatus =
        statusFilter === "ALL" || room.status === statusFilter;

      return (
        matchesSearch && matchesRoomType && matchesCapacity && matchesStatus
      );
    });
  }, [rooms, searchTerm, roomTypeFilter, capacityFilter, statusFilter]);

  const capacityOptions = useMemo(
    () =>
      [...new Set(rooms.map((room) => room.roomType.capacity))].sort(
        (first, second) => first - second,
      ),
    [rooms],
  );

  const clearFilters = () => {
    setSearchTerm("");
    setRoomTypeFilter("ALL");
    setCapacityFilter("ALL");
    setStatusFilter("ALL");
  };

  const openActionsMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    room: RoomListing,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 96;
    const left = Math.max(
      8,
      Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 8),
    );
    const top =
      bounds.bottom + menuHeight + 8 <= window.innerHeight
        ? bounds.bottom + 4
        : Math.max(8, bounds.top - menuHeight - 4);

    actionsMenuButtonRef.current = event.currentTarget;
    setActionsMenu({ room, top, left });
  };

  const closeActionsMenu = () => {
    setActionsMenu(null);
    actionsMenuButtonRef.current = null;
  };

  const openEditForm = (room: RoomListing) => {
    closeActionsMenu();
    setEditingRoomId(room.id);
    setRoomNumber(room.roomNumber);
    setRoomTypeId(room.roomType.id);
    setRoomStatus(room.status);
    setStatusReason("");
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRoomId(null);
    setRoomNumber("");
    setRoomTypeId("");
    setRoomStatus("AVAILABLE");
    setStatusReason("");
    setFormError("");
  };

  useEffect(() => {
    if (!isFormOpen || !editingRoomId) {
      return;
    }

    const closeEditModalOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) {
        closeForm();
      }
    };

    document.addEventListener("keydown", closeEditModalOnEscape);

    return () => {
      document.removeEventListener("keydown", closeEditModalOnEscape);
    };
  }, [isFormOpen, editingRoomId, isCreating]);

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!roomNumber.trim() || !roomTypeId) {
      setFormError("Please fill in all fields.");
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const newRoom = await createRoom(roomNumber.trim(), roomTypeId);

      setRooms((currentRooms) => [...currentRooms, newRoom]);

      setRoomNumber("");
      setRoomTypeId("");
      setIsFormOpen(false);
    } catch (error: any) {
      setFormError(error.response?.data?.message || "Unable to create room.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRoom = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingRoomId || !roomNumber.trim() || !roomTypeId) {
      setFormError("Please fill in all fields.");
      return;
    }

    if (roomStatus !== "AVAILABLE" && !statusReason.trim()) {
      setFormError("Please provide a reason for this room status.");
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const updatedRoom = await updateRoom(editingRoomId, {
        roomNumber: roomNumber.trim(),
        roomTypeId,
      });

      const updatedRoomWithStatus =
        roomStatus === rooms.find((room) => room.id === editingRoomId)?.status
          ? updatedRoom
          : await updateRoomStatus(
              editingRoomId,
              roomStatus,
              statusReason.trim() || undefined,
            );

      setRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === updatedRoomWithStatus.id ? updatedRoomWithStatus : room,
        ),
      );

      setRoomNumber("");
      setRoomTypeId("");
      setRoomStatus("AVAILABLE");
      setStatusReason("");
      setEditingRoomId(null);
      setIsFormOpen(false);
    } catch (error: any) {
      setFormError(error.response?.data?.message || "Unable to update room.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteRoom(roomToDelete.id);

      setRooms((currentRooms) =>
        currentRooms.filter((room) => room.id !== roomToDelete.id),
      );
      setRoomToDelete(null);
    } catch (error: any) {
      setError(error.response?.data?.message || "Unable to delete room.");
    } finally {
      setIsDeleting(false);
    }
  };

  const editingRoom = rooms.find((room) => room.id === editingRoomId);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-4xl">Rooms</h1>

        <button
          type="button"
          onClick={() => {
            setFormError("");
            setIsFormOpen(true);
          }}
          className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          Add Room
        </button>
      </div>

      {isFormOpen && (
        <div
          className={
            editingRoomId
              ? "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
              : "mt-8 rounded-2xl bg-white p-6"
          }
          role={editingRoomId ? "presentation" : undefined}
          onMouseDown={(event) => {
            if (
              editingRoomId &&
              event.target === event.currentTarget &&
              !isCreating
            ) {
              closeForm();
            }
          }}
        >
          <section
            role={editingRoomId ? "dialog" : undefined}
            aria-modal={editingRoomId ? true : undefined}
            aria-labelledby={editingRoomId ? "room-form-title" : undefined}
            className={
              editingRoomId
                ? "my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream p-5 shadow-xl sm:p-7"
                : ""
            }
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={editingRoomId ? "room-form-title" : undefined} className="font-display text-2xl">
                {editingRoomId ? "Edit Room" : "Add Room"}
              </h2>
              {editingRoomId && (
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isCreating}
                  aria-label="Close edit room dialog"
                  className="rounded-lg px-3 py-2 text-muted hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
              )}
            </div>

            {editingRoom && (
              <div className="mt-5 grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-[10rem_1fr] sm:items-center">
                <img
                  src={getRoomTypeImage(
                    editingRoom.roomType.name,
                    editingRoom.roomType.image,
                  )}
                  alt={`Room ${editingRoom.roomNumber} - ${editingRoom.roomType.name}`}
                  className="h-36 w-full rounded-xl bg-cream object-cover sm:h-28"
                />
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted">Room</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {editingRoom.roomNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Room Type</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {editingRoom.roomType.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Maximum Capacity</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {editingRoom.roomType.capacity}{" "}
                      {editingRoom.roomType.capacity === 1 ? "guest" : "guests"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Price per Night</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      ₱
                      {Number(
                        editingRoom.roomType.pricePerNight,
                      ).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <form
              onSubmit={editingRoomId ? handleUpdateRoom : handleCreateRoom}
              className="mt-6 space-y-4"
            >
            <div>
              <label className="text-sm font-medium">Room Number</label>

              <input
                type="text"
                value={roomNumber}
                onChange={(event) => setRoomNumber(event.target.value)}
                placeholder="e.g. 105"
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Room Type</label>

              <select
                value={roomTypeId}
                onChange={(event) => setRoomTypeId(event.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              >
                <option value="">Select room type</option>

                {roomTypes.map((roomType) => (
                  <option key={roomType.id} value={roomType.id}>
                    {roomType.name}
                  </option>
                ))}
              </select>
            </div>

            {editingRoomId && (
              <div>
                <label className="text-sm font-medium">Status</label>

                <select
                  value={roomStatus}
                  onChange={(event) =>
                    setRoomStatus(event.target.value as RoomStatus)
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}

            {editingRoomId && roomStatus !== "AVAILABLE" && (
              <div>
                <label className="text-sm font-medium">Status Reason</label>

                <input
                  type="text"
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="e.g. Scheduled maintenance"
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>
            )}

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isCreating
                  ? editingRoomId
                    ? "Saving..."
                    : "Creating..."
                  : editingRoomId
                    ? "Save Changes"
                    : "Create Room"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={isCreating}
                className="rounded-full border px-5 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
            </form>
          </section>
        </div>
      )}

      {isLoading && <p className="mt-8 text-sm text-muted">Loading rooms...</p>}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} />
        </div>
      )}

      {!isLoading && !error && (
        <section className="mt-8">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="sm:col-span-2 xl:col-span-1">
                <label
                  htmlFor="room-search"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Search room number
                </label>
                <input
                  id="room-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="e.g. 105"
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="room-type-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Room Type
                </label>
                <select
                  id="room-type-filter"
                  value={roomTypeFilter}
                  onChange={(event) => setRoomTypeFilter(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                >
                  <option value="ALL">All Types</option>
                  {roomTypes.map((roomType) => (
                    <option key={roomType.id} value={roomType.id}>
                      {roomType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="room-capacity-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Capacity
                </label>
                <select
                  id="room-capacity-filter"
                  value={capacityFilter}
                  onChange={(event) => setCapacityFilter(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                >
                  <option value="ALL">All Capacities</option>
                  {capacityOptions.map((capacity) => (
                    <option key={capacity} value={capacity}>
                      {capacity} {capacity === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="room-status-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Status
                </label>
                <select
                  id="room-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "ALL" | RoomStatus)
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-sm text-muted" aria-live="polite">
                Showing{" "}
                <span className="font-semibold text-ink">
                  {filteredRooms.length}
                </span>{" "}
                {filteredRooms.length === 1 ? "room" : "rooms"}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-sage underline underline-offset-2 hover:text-ink"
              >
                Clear filters
              </button>
            </div>
          </div>

          {filteredRooms.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((room) => {
                const image = getRoomTypeImage(
                  room.roomType.name,
                  room.roomType.image,
                );

                return (
                  <article
                    key={room.id}
                    className={`relative rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md ${
                      actionsMenu?.room.id === room.id ? "z-20" : ""
                    }`}
                  >
                    <div className="relative h-48 overflow-hidden rounded-t-2xl bg-cream">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sage/15 via-cream to-sage/10 text-muted"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="size-9"
                        >
                          <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 15h18M5 11V7a2 2 0 0 1 2-2h4v6M21 18v2M3 18v2" />
                        </svg>
                        <span className="text-xs font-medium">
                          Room image unavailable
                        </span>
                      </div>
                      <img
                        src={image}
                        alt={`Room ${room.roomNumber} - ${room.roomType.name}`}
                        className="relative z-10 size-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />

                      <button
                        type="button"
                        aria-label={`Actions for room ${room.roomNumber}`}
                        aria-haspopup="menu"
                        aria-expanded={actionsMenu?.room.id === room.id}
                        aria-controls={
                          actionsMenu?.room.id === room.id
                            ? "room-actions-menu"
                            : undefined
                        }
                        onClick={(event) => {
                          if (actionsMenu?.room.id === room.id) {
                            closeActionsMenu();
                            return;
                          }
                          openActionsMenu(event, room);
                        }}
                        className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
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
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-display text-2xl">
                            Room {room.roomNumber}
                          </h2>
                          <p className="mt-1 truncate text-sm text-muted">
                            {room.roomType.name}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wide ${roomStatusStyles[room.status]}`}
                        >
                          {room.status}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm">
                        <span className="text-muted">
                          Up to{" "}
                          <span className="font-semibold text-ink">
                            {room.roomType.capacity}
                          </span>{" "}
                          {room.roomType.capacity === 1 ? "guest" : "guests"}
                        </span>
                        <span className="font-semibold text-ink">
                          ₱
                          {Number(
                            room.roomType.pricePerNight,
                          ).toLocaleString()}{" "}
                          <span className="font-normal text-muted">/ night</span>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <h2 className="font-display text-2xl">
                {rooms.length === 0 ? "No rooms yet" : "No rooms match"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {rooms.length === 0
                  ? "Add a room to start managing your rooms."
                  : "Try adjusting your search or filters."}
              </p>
              {rooms.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setIsFormOpen(true);
                  }}
                  className="mt-5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                  Add Room
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 text-sm font-semibold text-sage underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {actionsMenu &&
        createPortal(
          <div
            id="room-actions-menu"
            ref={actionsMenuRef}
            role="menu"
            aria-label={`Actions for room ${actionsMenu.room.roomNumber}`}
            className="fixed z-[60] min-w-48 rounded-xl border border-black/10 bg-white p-1.5 shadow-xl"
            style={{ top: actionsMenu.top, left: actionsMenu.left }}
          >
            <button
              ref={firstMenuActionRef}
              type="button"
              role="menuitem"
              onClick={() => openEditForm(actionsMenu.room)}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
            >
              Edit Room
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const room = actionsMenu.room;
                closeActionsMenu();
                setRoomToDelete(room);
              }}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
            >
              Delete Room
            </button>
          </div>,
          document.body,
        )}

      <ConfirmDeleteModal
        isOpen={roomToDelete !== null}
        itemName={roomToDelete ? `Room ${roomToDelete.roomNumber}` : ""}
        isDeleting={isDeleting}
        onCancel={() => setRoomToDelete(null)}
        onConfirm={() => void handleDeleteRoom()}
      />
    </div>
  );
}