export type Room = {
  id: string;
  roomNumber: string;
  name: string;
  roomType: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  status: "Available" | "Occupied" | "Maintenance";
  image: string;
  tag?: string;
  features: string[];
};

export type NavItem = {
  label: string;
  to: string;
};
