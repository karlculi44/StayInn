import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  adminRaisedDark,
  adminRaisedLight,
} from "../../components/ui/adminButtonStyles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";

type RoomType = {
  id: string;
  name: string;
};

const PAGE_SIZE_OPTIONS = [6, 12, 24];

const roomStatusStyles: Record<RoomStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");
  const [capacityFilter, setCapacityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RoomStatus>("ALL");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(0);
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
  const [actionsMenu, setActionsMenu] = useState<RoomListing | null>(null);

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
  const pageCount = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount - 1);
  const visibleRooms = filteredRooms.slice(
    visiblePage * pageSize,
    (visiblePage + 1) * pageSize,
  );

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
    setCurrentPage(0);
  };

  const closeActionsMenu = () => {
    setActionsMenu(null);
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
  const renderRoomPagination = (className: string) => (
    <div
      className={`flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <label className="flex items-center gap-2 text-muted">
        Rooms per page
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setCurrentPage(0);
          }}
        >
          <SelectTrigger
            aria-label="Rooms per page"
            className="h-9 w-20 rounded-lg px-2.5 py-1.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="whitespace-nowrap text-muted" aria-live="polite">
          Page {visiblePage + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={visiblePage === 0}
            onClick={() => setCurrentPage(visiblePage - 1)}
            className={`rounded-lg px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={visiblePage >= pageCount - 1}
            onClick={() => setCurrentPage(visiblePage + 1)}
            className={`rounded-lg px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

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
          className={`rounded-full px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${adminRaisedDark}`}
        >
          Add Room
        </button>
      </div>

      {isFormOpen && (
        <div
          className={
            editingRoomId
              ? "fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/50 p-4"
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
                ? "my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl cursor-default overflow-y-auto rounded-2xl bg-cream p-5 shadow-xl sm:p-7"
                : ""
            }
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id={editingRoomId ? "room-form-title" : undefined}
                className="font-display text-2xl"
              >
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
                <label htmlFor="room-form-type" className="text-sm font-medium">
                  Room Type
                </label>

                <Select
                  value={roomTypeId || "__clear__"}
                  onValueChange={(value) =>
                    setRoomTypeId(value === "__clear__" ? "" : value)
                  }
                >
                  <SelectTrigger id="room-form-type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">Select room type</SelectItem>
                  {roomTypes.map((roomType) => (
                    <SelectItem key={roomType.id} value={roomType.id}>
                      {roomType.name}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>

              {editingRoomId && (
                <div>
                  <label htmlFor="room-form-status" className="text-sm font-medium">
                    Status
                  </label>

                  <Select
                    value={roomStatus}
                    onValueChange={(value) =>
                      setRoomStatus(value as RoomStatus)
                    }
                  >
                    <SelectTrigger id="room-form-status" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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
                  className={`rounded-full px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedDark}`}
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
                  className={`rounded-full px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
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
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(0);
                  }}
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
                <Select
                  value={roomTypeFilter}
                  onValueChange={(value) => {
                    setRoomTypeFilter(value);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger id="room-type-filter" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    {roomTypes.map((roomType) => (
                      <SelectItem key={roomType.id} value={roomType.id}>
                        {roomType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="room-capacity-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Capacity
                </label>
                <Select
                  value={capacityFilter}
                  onValueChange={(value) => {
                    setCapacityFilter(value);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger id="room-capacity-filter" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Capacities</SelectItem>
                    {capacityOptions.map((capacity) => (
                      <SelectItem key={capacity} value={String(capacity)}>
                        {capacity} {capacity === 1 ? "guest" : "guests"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="room-status-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as "ALL" | RoomStatus);
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger id="room-status-filter" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                    <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
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
            <>
              {renderRoomPagination("mt-5")}
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleRooms.map((room) => {
                const image = getRoomTypeImage(
                  room.roomType.name,
                  room.roomType.image,
                );

                return (
                  <article
                    key={room.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`View details for room ${room.roomNumber}`}
                    onClick={() => navigate(`/admin/rooms/${room.id}`)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        navigate(`/admin/rooms/${room.id}`);
                      }
                    }}
                    className={`relative rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md ${
                      actionsMenu?.id === room.id ? "z-20" : ""
                    } cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sage`}
                  >
                    <div className="relative h-48 overflow-hidden rounded-t-2xl bg-cream">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-sage/15 via-cream to-sage/10 text-muted"
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

                      <DropdownMenu
                        open={actionsMenu?.id === room.id}
                        onOpenChange={(isOpen) =>
                          setActionsMenu((currentRoom) =>
                            isOpen
                              ? room
                              : currentRoom?.id === room.id
                                ? null
                                : currentRoom,
                          )
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for room ${room.roomNumber}`}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-full border-t border-t-white border-b border-b-black/20 bg-white/95 text-ink shadow-[0_2px_0_rgba(0,0,0,0.16),0_4px_8px_rgba(0,0,0,0.12)] transition-[transform,box-shadow] hover:bg-white active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
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
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          aria-label={`Actions for room ${room.roomNumber}`}
                        >
                          <DropdownMenuItem onSelect={() => openEditForm(room)}>
                            Edit Room
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setActionsMenu(null);
                              setRoomToDelete(room);
                            }}
                          >
                            Delete Room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                          {Number(room.roomType.pricePerNight).toLocaleString()}{" "}
                          <span className="font-normal text-muted">
                            / night
                          </span>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
              {renderRoomPagination("mt-6 border-t border-black/10 pt-4")}
            </>
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
                  className={`mt-5 rounded-full px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${adminRaisedDark}`}
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
