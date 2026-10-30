export type Notification = {
  id: string;
  type: "RESERVATION_STATUS_UPDATED" | "NEW_RESERVATION";
  title: string;
  message: string;
  referenceId: string | null;
  referenceType: "RESERVATION" | null;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
  reservation: {
    id: string;
    referenceId: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    guestName: string | null;
  } | null;
};
