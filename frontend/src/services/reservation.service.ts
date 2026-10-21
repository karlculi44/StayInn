import { api } from "./api";
import type {
  AdminReservation,
  ReservationStatus,
} from "../types/admin-reservation";
import type { Reservation } from "../types/reservation";

export const getReservations = async (): Promise<Reservation[]> => {
  try {
    const response = await api.get("/reservations");
    return response.data;
  } catch (error) {
    console.error("Error fetching reservations:", error);
    throw error;
  }
};

export const getReservation = async (id: string): Promise<Reservation> => {
  const response = await api.get<Reservation>(`/reservations/${id}`);

  return response.data;
};

export const cancelReservation = async (id: string) => {
  const response = await api.patch(`/reservations/${id}/cancel`);

  return response.data;
};

export const createReservation = async (
  roomId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
) => {
  const response = await api.post("/reservations", {
    roomId,
    checkIn,
    checkOut,
    guests,
  });

  return response.data;
};

// Admin-specific reservation services

export const getAdminReservations = async (): Promise<AdminReservation[]> => {
  const response = await api.get<AdminReservation[]>("/reservations/admin");
  return response.data;
};

export const getAdminReservation = async (
  id: string,
): Promise<AdminReservation> => {
  const response = await api.get<AdminReservation>(
    `/reservations/admin/${id}`,
  );
  return response.data;
};

export const updateReservationStatus = async (
  id: string,
  status: ReservationStatus,
) => {
  const response = await api.patch<{ status: ReservationStatus }>(
    `/reservations/${id}/status`,
    {
    status,
    },
  );

  return response.data;
};

export const createAdminReservation = async (reservation: {
  userId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}): Promise<AdminReservation> => {
  const response = await api.post<AdminReservation>(
    "/reservations/admin",
    reservation,
  );

  return response.data;
};

export const updateAdminReservation = async (
  id: string,
  reservation: {
    userId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  },
): Promise<AdminReservation> => {
  const response = await api.patch<AdminReservation>(
    `/reservations/admin/${id}`,
    reservation,
  );

  return response.data;
};
