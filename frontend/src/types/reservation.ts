export type Reservation = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: string;
  status: string;
  room: {
    roomNumber: string;
    roomType: {
      name: string;
      image: string | null;
    };
  };
};
