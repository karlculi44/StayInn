import { api } from "./api";

type RoomTypeInput = {
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  image?: File | null;
};

const createRoomTypeFormData = (data: Partial<RoomTypeInput>) => {
  const formData = new FormData();
  if (data.name !== undefined) formData.append("name", data.name);
  if (data.description !== undefined) {
    formData.append("description", data.description);
  }
  if (data.capacity !== undefined) {
    formData.append("capacity", String(data.capacity));
  }
  if (data.pricePerNight !== undefined) {
    formData.append("pricePerNight", String(data.pricePerNight));
  }
  if (data.image) formData.append("image", data.image);
  return formData;
};

export const getRoomTypes = async () => {
  const response = await api.get("/room-types");

  return response.data;
};

export const createRoomType = async (data: RoomTypeInput) => {
  const response = await api.post(
    "/room-types",
    createRoomTypeFormData(data),
  );

  return response.data;
};

export const updateRoomType = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    capacity?: number;
    pricePerNight?: number;
    image?: File | null;
  },
) => {
  const response = await api.patch(
    `/room-types/${id}`,
    createRoomTypeFormData(data),
  );

  return response.data;
};

export const deleteRoomType = async (id: string) => {
  await api.delete(`/room-types/${id}`);
};
