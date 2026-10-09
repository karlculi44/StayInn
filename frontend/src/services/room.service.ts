import { api } from "./api";

export const getRooms = async () => {
  const response = await api.get("/rooms");

  return response.data;
};

export const getRoom = async (id: string) => {
  const response = await api.get(`/rooms/${id}`);

  return response.data;
};

export const getAvailableRooms = async (checkIn: string, checkOut: string) => {
  const response = await api.get("/rooms/availability", {
    params: {
      checkIn,
      checkOut,
    },
  });

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

export const deleteRoom = async (id: string) => {
  await api.delete(`/rooms/${id}`);
};
