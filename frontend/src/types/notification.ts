export type Notification = {
  id: string;
  type: "RESERVATION_STATUS_UPDATED";
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  reservationId: string | null;
};
