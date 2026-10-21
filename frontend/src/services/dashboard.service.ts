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

export type MonthlyBookingTrend = {
  month: string;
  reservationCount: number;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>("/admin/dashboard");

  return response.data;
};

export type BookingTrendRange =
  | "today"
  | "3d"
  | "week"
  | "7d"
  | "3w"
  | "30d"
  | "3m"
  | "12m";

export const getMonthlyBookingTrends = async (
  range: BookingTrendRange = "12m",
): Promise<MonthlyBookingTrend[]> => {
  const response = await api.get<MonthlyBookingTrend[]>(
    "/admin/dashboard/monthly-booking-trends",
    { params: { range } },
  );

  return response.data;
};
