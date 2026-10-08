import { api } from "./api";

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
