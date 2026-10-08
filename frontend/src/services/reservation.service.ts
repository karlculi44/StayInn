import { api } from "./api";

export const getReservations = async () => {
  try {
    const response = await api.get("/reservations");
    return response.data;
  } catch (error) {
    console.error("Error fetching reservations:", error);
    throw error;
  }
};

export const getReservation = async (id: string) => {
  const response = await api.get(`/reservations/${id}`);

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

export const getAdminReservations = async () => {
  const response = await api.get("/reservations/admin");
  return response.data;
};

export const updateReservationStatus = async (id: string, status: string) => {
  const response = await api.patch(`/reservations/${id}/status`, {
    status,
  });

  return response.data;
};
