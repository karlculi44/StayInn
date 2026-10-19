import { api } from "./api";

export type DashboardStats = {
  totalUsers: number;
  totalRooms: number;
  availableRooms: number;
  totalReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  cancelledReservations: number;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>("/admin/dashboard");

  return response.data;
};
