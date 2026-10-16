import { api } from "./api";
import type { RoomListing } from "../types";

export const getRooms = async () => {
  const response = await api.get<RoomListing[]>("/rooms");

  return response.data;
};

export const getAllRoomsForAdmin = async () => {
  const response = await api.get<RoomListing[]>("/rooms/admin");

  return response.data;
};

export const getRoom = async (id: string): Promise<RoomListing> => {
  const response = await api.get<RoomListing>(`/rooms/${id}`);

  return response.data;
};

export const getAvailableRooms = async (
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string,
) => {
  const response = await api.get<RoomListing[]>(
    excludeReservationId ? "/rooms/availability/admin" : "/rooms/availability",
    {
    params: {
      checkIn,
      checkOut,
      ...(excludeReservationId ? { excludeReservationId } : {}),
    },
    },
  );

  return response.data;
};

export const createRoom = async (roomNumber: string, roomTypeId: string) => {
  const response = await api.post("/rooms", {
    roomNumber,
    roomTypeId,
  });

  return response.data;
};

export const updateRoom = async (
  id: string,
  data: {
    roomNumber?: string;
    roomTypeId?: string;
    status?: string;
  },
) => {
  const response = await api.patch(`/rooms/${id}`, data);

  return response.data;
};

export const updateRoomStatus = async (
  id: string,
  status: "AVAILABLE" | "MAINTENANCE" | "INACTIVE",
  reason?: string,
) => {
  const response = await api.patch(`/rooms/${id}/status`, {
    status,
    ...(reason ? { reason } : {}),
  });

  return response.data;
};

export const deleteRoom = async (id: string) => {
  await api.delete(`/rooms/${id}`);
};
