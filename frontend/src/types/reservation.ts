export type Reservation = {
  id: string;
  referenceId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: string;
  status: string;
  createdAt: string;
  room: {
    roomNumber: string;
    roomType: {
      name: string;
      description: string;
      capacity: number;
      pricePerNight: string;
      image: string | null;
    };
  };
};
