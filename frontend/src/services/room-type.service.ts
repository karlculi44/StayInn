import { api } from "./api";

export const getRoomTypes = async () => {
  const response = await api.get("/room-types");

  return response.data;
};

export const createRoomType = async (data: {
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
}) => {
  const response = await api.post("/room-types", data);

  return response.data;
};

export const updateRoomType = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    capacity?: number;
    pricePerNight?: number;
  },
) => {
  const response = await api.patch(`/room-types/${id}`, data);

  return response.data;
};

export const deleteRoomType = async (id: string) => {
  await api.delete(`/room-types/${id}`);
};
