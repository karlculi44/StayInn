import { api } from "./api";

export const getAvailableRooms = async (checkIn: string, checkOut: string) => {
  const response = await api.get("/rooms/availability", {
    params: {
      checkIn,
      checkOut,
    },
  });

  return response.data;
};
