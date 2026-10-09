import { api } from "./api";

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getUser = async (id: string) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const updateUserRole = async (id: string, role: string) => {
  const response = await api.patch(`/users/${id}/role`, { role });
  return response.data;
};

export const deleteUser = async (id: string) => {
  await api.delete(`/users/${id}`);
};
