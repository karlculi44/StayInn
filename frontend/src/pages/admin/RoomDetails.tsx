import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, Loading } from "../../components/ui/States";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import ConfirmSaveModal from "../../components/ui/ConfirmSaveModal";
import {
  deleteRoom,
  getAdminRoom,
  updateRoom,
  updateRoomStatus,
} from "../../services/room.service";
import { getRoomTypes } from "../../services/room-type.service";
import type { RoomListing } from "../../types";
import { formatCurrency } from "../../utils/format";
import { getRoomTypeImage } from "../../utils/room-image";
import {
  adminRaisedDanger,
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

type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";

type RoomResult = {
  id: string;
  room?: RoomListing;
  error?: string;
};

const inputClass = "mt-2 w-full rounded-xl border px-4 py-3";

export default function AdminRoomDetails() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<RoomResult | null>(null);
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("AVAILABLE");
  const [statusReason, setStatusReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    void getRoomTypes()
      .then(setRoomTypes)
      .catch(() => setRoomTypes([]));
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!roomId) {
      return () => {
        isMounted = false;
      };
    }

    void getAdminRoom(roomId)
      .then((room) => {
        if (isMounted) {
          setResult({ id: roomId, room });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setResult({
            id: roomId,
            error:
              axios.isAxiosError(error) && error.response?.status === 404
                ? "Room not found."
                : "Unable to load this room.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const currentResult = result?.id === roomId ? result : null;
  const room = currentResult?.room;
  const error = currentResult?.error;

  if (!roomId) {
    return (
      <div className="space-y-5">
        <Link
          to="/admin/rooms"
          className="text-sm font-semibold text-sage hover:text-sage-dark"
        >
          ← Back to rooms
        </Link>
        <ErrorState message="Room not found." />
      </div>
    );
  }

  if (!room && !error) {
    return <Loading label="Loading room details..." />;
  }

  if (error || !room) {
    return (
      <div className="space-y-5">
        <Link
          to="/admin/rooms"
          className="text-sm font-semibold text-sage hover:text-sage-dark"
        >
          ← Back to rooms
        </Link>
        <ErrorState message={error ?? "Room not found."} />
      </div>
    );
  }

  const image = getRoomTypeImage(room.roomType.name, room.roomType.image);

  const startEditing = () => {
    setRoomNumber(room.roomNumber);
    setRoomTypeId(room.roomType.id);
    setRoomStatus(room.status);
    setStatusReason("");
    setFieldErrors({});
    setSaveError("");
    setSuccessMessage("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFieldErrors({});
    setSaveError("");
  };

  const requestSave = (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!roomNumber.trim()) {
      errors.roomNumber = "Room number is required.";
    }
    if (!roomTypeId) {
      errors.roomTypeId = "Please select a room type.";
    }
    if (roomStatus !== "AVAILABLE" && !statusReason.trim()) {
      errors.statusReason = "Please provide a reason for this room status.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      setSaveError("");
      setIsConfirmOpen(true);
    }
  };

  const confirmSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      const updatedRoom = await updateRoom(room.id, {
        roomNumber: roomNumber.trim(),
        roomTypeId,
      });
      const finalRoom =
        roomStatus === room.status
          ? updatedRoom
          : await updateRoomStatus(
              room.id,
              roomStatus,
              statusReason.trim() || undefined,
            );

      setResult({ id: room.id, room: finalRoom });
      setIsConfirmOpen(false);
      setIsEditing(false);
      setSuccessMessage("Room updated successfully.");
    } catch (error: unknown) {
      setSaveError(
        (axios.isAxiosError(error) && error.response?.data?.message) ||
          "Unable to update room.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteRoom(room.id);
      navigate("/admin/rooms");
    } catch (error: unknown) {
      setDeleteError(
        (axios.isAxiosError(error) && error.response?.data?.message) ||
          "Unable to delete room.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const errorText = (field: string) =>
    fieldErrors[field] && (
      <p className="mt-1 text-sm text-red-600">{fieldErrors[field]}</p>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Admin workspace · Room {room.roomNumber}
          </p>
          <h1 className="mt-2 font-display text-4xl">Room Details</h1>
        </div>
        {!isEditing && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={startEditing}
              className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedDark}`}
            >
              Edit Room
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setIsDeleteOpen(true);
              }}
              className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedDanger}`}
            >
              Delete Room
            </button>
          </div>
        )}
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-700"
        >
          {successMessage}
        </p>
      )}

      <section className="grid overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <img
          src={image}
          alt={`Room ${room.roomNumber} - ${room.roomType.name}`}
          className="aspect-4/3 size-full object-cover lg:aspect-auto lg:min-h-96"
        />
        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form onSubmit={requestSave} className="space-y-4" noValidate>
              <div>
                <label htmlFor="edit-room-number" className="text-sm font-medium">
                  Room Number
                </label>
                <input
                  id="edit-room-number"
                  type="text"
                  value={roomNumber}
                  onChange={(event) => setRoomNumber(event.target.value)}
                  placeholder="e.g. 105"
                  aria-invalid={Boolean(fieldErrors.roomNumber)}
                  className={inputClass}
                />
                {errorText("roomNumber")}
              </div>

              <div>
                <label htmlFor="edit-room-type" className="text-sm font-medium">
                  Room Type
                </label>
                <Select
                  value={roomTypeId || "__clear__"}
                  onValueChange={(value) =>
                    setRoomTypeId(value === "__clear__" ? "" : value)
                  }
                >
                  <SelectTrigger id="edit-room-type" className="mt-2">
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
                {errorText("roomTypeId")}
              </div>

              <div>
                <label htmlFor="edit-room-status" className="text-sm font-medium">
                  Status
                </label>
                <Select
                  value={roomStatus}
                  onValueChange={(value) => setRoomStatus(value as RoomStatus)}
                >
                  <SelectTrigger id="edit-room-status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {roomStatus !== "AVAILABLE" && (
                <div>
                  <label
                    htmlFor="edit-status-reason"
                    className="text-sm font-medium"
                  >
                    Status Reason
                  </label>
                  <input
                    id="edit-status-reason"
                    type="text"
                    value={statusReason}
                    onChange={(event) => setStatusReason(event.target.value)}
                    placeholder="e.g. Scheduled maintenance"
                    aria-invalid={Boolean(fieldErrors.statusReason)}
                    className={inputClass}
                  />
                  {errorText("statusReason")}
                </div>
              )}

              <p className="text-sm text-muted">
                Capacity and price are set by the room type and shown below.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedDark}`}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedLight}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted">
                    Room {room.roomNumber}
                  </p>
                  <h2 className="mt-1 font-display text-3xl">
                    {room.roomType.name}
                  </h2>
                </div>
                <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                  {room.status}
                </span>
              </div>

              <p className="mt-5 leading-7 text-muted">
                {room.roomType.description}
              </p>
            </>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cream p-4">
              <dt className="text-sm text-muted">Capacity</dt>
              <dd className="mt-1 font-semibold">
                {room.roomType.capacity}{" "}
                {room.roomType.capacity === 1 ? "guest" : "guests"}
              </dd>
            </div>
            <div className="rounded-xl bg-cream p-4">
              <dt className="text-sm text-muted">Price per night</dt>
              <dd className="mt-1 font-semibold">
                {formatCurrency(Number(room.roomType.pricePerNight))}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-cream p-4">
              <dt className="text-sm text-muted">Room type</dt>
              <dd className="mt-1 font-semibold">{room.roomType.name}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <Link
              to="/admin/rooms"
              className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold ${adminRaisedLight}`}
            >
              Back to room management
            </Link>
          </div>
        </div>
      </section>

      <ConfirmSaveModal
        isOpen={isConfirmOpen}
        isSaving={isSaving}
        errorMessage={saveError}
        onCancel={() => {
          setIsConfirmOpen(false);
          setSaveError("");
        }}
        onConfirm={() => void confirmSave()}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        itemName={`Room ${room.roomNumber}`}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
