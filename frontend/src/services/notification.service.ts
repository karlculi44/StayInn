import { api } from "./api";
import type { Notification } from "../types/notification";

export const NOTIFICATIONS_UPDATED_EVENT = "stayinn:notifications-updated";

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get<Notification[]>("/notifications");
  return response.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return response.data.count;
};

export const markNotificationAsRead = async (
  id: string,
): Promise<Notification> => {
  const response = await api.patch<Notification>(`/notifications/${id}/read`);
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  return response.data;
};

export const markAllNotificationsAsRead = async (): Promise<{
  count: number;
  readAt: string;
}> => {
  const response = await api.patch<{ count: number; readAt: string }>(
    "/notifications/read-all",
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  return response.data;
};
