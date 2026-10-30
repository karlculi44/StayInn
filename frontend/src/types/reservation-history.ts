export type ReservationHistoryAction =
  | "CREATED"
  | "CONFIRMED"
  | "CANCELLED"
  | "UPDATED"
  | "COMPLETED";

export type ReservationHistoryVisibility = "ADMIN_ONLY" | "GUEST_VISIBLE";

export type ReservationHistoryValue =
  | string
  | number
  | boolean
  | null
  | ReservationHistoryObject
  | ReservationHistoryValue[];

export type ReservationHistoryObject = {
  [key: string]: ReservationHistoryValue;
};

export type ReservationHistory = {
  id: string;
  reservationId: string;
  actorId: string | null;
  action: ReservationHistoryAction;
  description: string;
  oldValues: ReservationHistoryObject | null;
  newValues: ReservationHistoryObject | null;
  visibility: ReservationHistoryVisibility;
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    role: "GUEST" | "ADMIN";
  } | null;
};
