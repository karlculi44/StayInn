import { api } from "./api";
import type { User } from "../context/auth-context";

export const login = async (email: string, password: string) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const register = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string,
) => {
  const response = await api.post("/auth/register", {
    firstName,
    lastName,
    email,
    password,
  });

  return response.data;
};

export const getMe = async () => {
  const response = await api.get("/auth/me");

  return response.data;
};

export const updateMyProfile = async (profile: {
  firstName: string;
  lastName: string;
}): Promise<User> => {
  const response = await api.patch<User>("/auth/me", profile);

  return response.data;
};

export const logout = async () => {
  const response = await api.post("/auth/logout");

  return response.data;
};
