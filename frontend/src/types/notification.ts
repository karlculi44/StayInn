export type Notification = {
  id: string;
  type:
    | "RESERVATION_STATUS_UPDATED"
    | "NEW_RESERVATION"
    | "RESERVATION_REQUEST_SUBMITTED"
    | "RESERVATION_REQUEST_REVIEWED";
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
