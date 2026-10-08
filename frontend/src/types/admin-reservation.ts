export type AdminReservation = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: string;
  status: string;
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
