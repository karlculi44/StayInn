import { api } from "./api";

export const getRoom = async (id: string) => {
  const response = await api.get(`/rooms/${id}`);

  return response.data;
};
