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
    firstName: string;
    lastName: string;
    email: string;
  };
  room: {
    roomNumber: string;
    roomType: {
      name: string;
    };
  };
};
