import { useEffect, useState } from "react";
import {
  createRoom,
  deleteRoom,
  getRooms,
  updateRoom,
} from "../../services/room.service";
import { getRoomTypes } from "../../services/room-type.service";
import { ErrorState } from "../../components/ui/States";

type Room = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: {
    name: string;
    capacity: number;
    pricePerNight: string;
  };
};

type RoomType = {
  id: string;
  name: string;
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await getRooms();
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

    setIsCreating(true);
    setFormError("");

    try {
      const updatedRoom = await updateRoom(editingRoomId, {
        roomNumber: roomNumber.trim(),
        roomTypeId,
      });

      setRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === updatedRoom.id ? updatedRoom : room,
        ),
      );

      setRoomNumber("");
      setRoomTypeId("");
      setEditingRoomId(null);
      setIsFormOpen(false);
    } catch (error: any) {
      setFormError(error.response?.data?.message || "Unable to update room.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this room?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteRoom(id);

      setRooms((currentRooms) => currentRooms.filter((room) => room.id !== id));
    } catch (error: any) {
      setError(error.response?.data?.message || "Unable to delete room.");
    }
  };

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
        <div className="mt-8 rounded-2xl bg-white p-6">
          <h2 className="font-display text-2xl">
            {editingRoomId ? "Edit Room" : "Add Room"}
          </h2>

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

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-3">
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
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingRoomId(null);
                  setRoomNumber("");
                  setRoomTypeId("");
                  setFormError("");
                }}
                className="rounded-full border px-5 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <p className="mt-8 text-sm text-muted">Loading rooms...</p>}

      {error && (
        <div className="mt-8">
          <ErrorState message={error} />
        </div>
      )}

      {!isLoading && !error && (
        <div className="mt-8 overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b last:border-b-0">
                    <td className="px-6 py-4 font-semibold">
                      {room.roomNumber}
                    </td>

                    <td className="px-6 py-4">{room.roomType.name}</td>

                    <td className="px-6 py-4">{room.roomType.capacity}</td>

                    <td className="px-6 py-4">
                      ₱{Number(room.roomType.pricePerNight).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">{room.status}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoomId(room.id);
                            setRoomNumber(room.roomNumber);
                            setRoomTypeId(
                              roomTypes.find(
                                (type) => type.name === room.roomType.name,
                              )?.id ?? "",
                            );
                            setFormError("");
                            setIsFormOpen(true);
                          }}
                          className="text-sm font-semibold underline"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-sm font-semibold text-red-600 underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
