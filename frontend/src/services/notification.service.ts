import { api } from "./api";
import type { Notification } from "../types/notification";

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get<Notification[]>("/notifications");
  return response.data;
};

export const markNotificationAsRead = async (
  id: string,
): Promise<Notification> => {
  const response = await api.patch<Notification>(`/notifications/${id}/read`);
  return response.data;
};
