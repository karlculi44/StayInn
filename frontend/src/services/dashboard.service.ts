import { api } from "./api";

export const getDashboardStats = async () => {
  const response = await api.get("/admin/dashboard");

  return response.data;
};
