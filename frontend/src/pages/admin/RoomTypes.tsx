import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from "../../services/room-type.service";
import { ErrorState, Loading } from "../../components/ui/States";
import DataTable from "../../components/ui/DataTable";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import axios from "axios";
import {
  adminRaisedDanger,
  adminRaisedDark,
  adminRaisedLight,
  adminRaisedSage,
} from "../../components/ui/adminButtonStyles";

type RoomType = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: string | number;
};

export default function RoomTypes() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [pricePerNight, setPricePerNight] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingRoomTypeId, setEditingRoomTypeId] = useState<string | null>(
    null,
  );
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<RoomType | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const data = await getRoomTypes();
        setRoomTypes(data);
      } catch {
        setError("Unable to load room types.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomTypes();
  }, []);

  const handleCreateRoomType = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !description.trim() || !capacity || !pricePerNight) {
      setFormError("Please fill in all fields.");
      return;
    }

    const price = Number(pricePerNight);

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Price must be greater than zero.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setFormError("Capacity must be a positive whole number.");
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const newRoomType = await createRoomType({
        name: name.trim(),
        description: description.trim(),
        capacity,
        pricePerNight: price,
      });

      setRoomTypes((currentRoomTypes) => [...currentRoomTypes, newRoomType]);

      setName("");
      setDescription("");
      setCapacity(2);
      setPricePerNight("");
      setIsFormOpen(false);
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;

      setFormError(message || "Unable to create room type.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRoomType = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !editingRoomTypeId ||
      !name.trim() ||
      !description.trim() ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      !pricePerNight
    ) {
      setFormError("Please provide valid values for all fields.");
      return;
    }

    const price = Number(pricePerNight);

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Price must be greater than zero.");
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const updatedRoomType = await updateRoomType(editingRoomTypeId, {
        name: name.trim(),
        description: description.trim(),
        capacity,
        pricePerNight: price,
      });

      setRoomTypes((currentRoomTypes) =>
        currentRoomTypes.map((roomType) =>
          roomType.id === updatedRoomType.id ? updatedRoomType : roomType,
        ),
      );

      setEditingRoomTypeId(null);
      setName("");
      setDescription("");
      setCapacity(2);
      setPricePerNight("");
      setIsFormOpen(false);
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;

      setFormError(message || "Unable to update room type.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoomType = async () => {
    if (!roomTypeToDelete) return;

    setActionError("");
    setIsDeleting(true);

    try {
      await deleteRoomType(roomTypeToDelete.id);

      setRoomTypes((currentRoomTypes) =>
        currentRoomTypes.filter(
          (roomType) => roomType.id !== roomTypeToDelete.id,
        ),
      );
      setRoomTypeToDelete(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setActionError(
          error.response?.data?.message ?? "Unable to delete room type.",
        );
      } else {
        setActionError("An unexpected error occurred.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const roomTypeColumns = useMemo<ColumnDef<RoomType, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-semibold text-ink">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        meta: { className: "min-w-64 text-muted" },
      },
      {
        accessorKey: "capacity",
        header: "Capacity",
        cell: ({ row }) => `${row.original.capacity} guests`,
        meta: { className: "whitespace-nowrap" },
      },
      {
        id: "pricePerNight",
        accessorFn: (roomType) => Number(roomType.pricePerNight),
        header: "Price per Night",
        cell: ({ row }) =>
          `₱${Number(row.original.pricePerNight).toLocaleString()}`,
        meta: { className: "whitespace-nowrap" },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const roomType = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingRoomTypeId(roomType.id);
                  setName(roomType.name);
                  setDescription(roomType.description);
                  setCapacity(roomType.capacity);
                  setPricePerNight(String(roomType.pricePerNight));
                  setFormError("");
                  setIsFormOpen(true);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${adminRaisedSage}`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setRoomTypeToDelete(roomType)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${adminRaisedDanger}`}
              >
                Delete
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [],
  );
  const filteredRoomTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return roomTypes.filter(
      (roomType) =>
        !query ||
        roomType.name.toLowerCase().includes(query) ||
        roomType.description.toLowerCase().includes(query),
    );
  }, [roomTypes, searchTerm]);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Admin workspace
      </p>

      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Room Types</h1>

        <button
          type="button"
          onClick={() => {
            setEditingRoomTypeId(null);
            setName("");
            setDescription("");
            setCapacity(2);
            setPricePerNight("");
            setFormError("");
            setIsFormOpen(true);
          }}
          className={`rounded-full px-5 py-3 text-sm font-semibold ${adminRaisedDark}`}
        >
          Add Room Type
        </button>
      </div>

      {isFormOpen && (
        <div
          className={
            editingRoomTypeId
              ? "fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/50 p-4"
              : "mt-8 rounded-2xl bg-white p-6"
          }
          role={editingRoomTypeId ? "presentation" : undefined}
          onMouseDown={(event) => {
            if (
              editingRoomTypeId &&
              event.target === event.currentTarget &&
              !isCreating
            ) {
              setIsFormOpen(false);
              setEditingRoomTypeId(null);
              setFormError("");
            }
          }}
        >
          <section
            role={editingRoomTypeId ? "dialog" : undefined}
            aria-modal={editingRoomTypeId ? true : undefined}
            aria-labelledby={editingRoomTypeId ? "room-type-form-title" : undefined}
            className={
              editingRoomTypeId
                ? "my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl cursor-default overflow-y-auto rounded-2xl border border-black/10 bg-white p-6 shadow-xl sm:p-8"
                : ""
            }
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id={editingRoomTypeId ? "room-type-form-title" : undefined}
                className="font-display text-2xl"
              >
                {editingRoomTypeId ? "Edit Room Type" : "Add Room Type"}
              </h2>
              {editingRoomTypeId && (
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingRoomTypeId(null);
                    setFormError("");
                  }}
                  disabled={isCreating}
                  aria-label="Close edit room type dialog"
                  className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Close
                </button>
              )}
            </div>

            <form
              onSubmit={
                editingRoomTypeId ? handleUpdateRoomType : handleCreateRoomType
              }
              className="mt-6 space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Executive Suite"
                  required
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe this room type"
                  required
                  rows={3}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Capacity (guests)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={capacity}
                  onChange={(event) => setCapacity(Number(event.target.value))}
                  required
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Price per Night (₱)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={pricePerNight}
                  onChange={(event) => setPricePerNight(event.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedDark}`}
                >
                  {isCreating
                    ? editingRoomTypeId
                      ? "Saving..."
                      : "Creating..."
                    : editingRoomTypeId
                      ? "Save Changes"
                      : "Create Room Type"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setName("");
                    setDescription("");
                    setCapacity(2);
                    setPricePerNight("");
                    setFormError("");
                    setEditingRoomTypeId(null);
                  }}
                  disabled={isCreating}
                  className={`rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isLoading && (
        <div className="mt-8">
          <Loading label="Loading room types..." />
        </div>
      )}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} />
        </div>
      )}

      {!isLoading && !error && (
        <div className="mt-8">
          {actionError && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {actionError}
            </p>
          )}

          <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4">
            <label htmlFor="room-types-search" className="text-sm font-medium">
              Search room types
            </label>
            <input
              id="room-types-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name or description"
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </div>
          <DataTable
            columns={roomTypeColumns}
            data={filteredRoomTypes}
            emptyMessage={
              roomTypes.length === 0
                ? "No room types have been added yet."
                : "No room types match your search."
            }
            tableClassName="min-w-[48rem]"
          />
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={roomTypeToDelete !== null}
        itemName={roomTypeToDelete?.name ?? ""}
        isDeleting={isDeleting}
        onCancel={() => setRoomTypeToDelete(null)}
        onConfirm={() => void handleDeleteRoomType()}
      />
    </div>
  );
}