export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type AdminReservation = {
  id: string;
  referenceId: string;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: string;
  status: ReservationStatus;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  room: {
    id: string;
    roomNumber: string;
    roomType: {
      name: string;
    };
  };
};
