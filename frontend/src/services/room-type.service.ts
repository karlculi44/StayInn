import { api } from "./api";

export const getRoomTypes = async () => {
  const response = await api.get("/room-types");

  return response.data;
};
