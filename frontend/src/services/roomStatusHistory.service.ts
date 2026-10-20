import { api } from "./api";

export type RoomStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";

export type RoomStatusHistoryEntry = {
  id: string;
  previousStatus: RoomStatus;
  newStatus: RoomStatus;
  reason: string;
  createdAt: string;
  room: { id: string; roomNumber: string } | null;
  admin: { id: string; firstName: string; lastName: string } | null;
};

export const getRoomStatusHistory = async () => {
  const response = await api.get<RoomStatusHistoryEntry[]>(
    "/admin/room-status-history",
  );

  return response.data;
};
