import { api } from "./api";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl: string | null;
  role: "ADMIN" | "GUEST";
  createdAt: string;
};

export const createUser = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: AdminUser["role"];
}): Promise<AdminUser> => {
  const response = await api.post<AdminUser>("/users", data);
  return response.data;
};

export const getUsers = async (): Promise<AdminUser[]> => {
  const response = await api.get<AdminUser[]>("/users");
  return response.data;
};

export const getUser = async (id: string) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const updateUserRole = async (id: string, role: AdminUser["role"]) => {
  const response = await api.patch(`/users/${id}/role`, { role });
  return response.data;
};

export const deleteUser = async (id: string) => {
  await api.delete(`/users/${id}`);
};
