export type Reservation = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: string;
  room: {
    roomNumber: string;
    roomType: {
      name: string;
    };
  };
};
