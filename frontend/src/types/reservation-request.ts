import type { ReservationStatus } from "./admin-reservation";

export type ReservationRequestType = "EDIT" | "CANCELLATION";
export type ReservationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReservationRequestValues = {
  status?: ReservationStatus;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  totalAmount?: string;
  [key: string]: unknown;
};

export type ReservationRequest = {
  id: string;
  reservationId: string;
  guestId: string | null;
  type: ReservationRequestType;
  status: ReservationRequestStatus;
  reason: string;
  originalValues: ReservationRequestValues;
  proposedChanges: ReservationRequestValues | null;
  reviewedBy: string | null;
  reviewReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  guest: { id: string; firstName: string; lastName: string } | null;
  reviewer: { id: string; firstName: string; lastName: string } | null;
};
