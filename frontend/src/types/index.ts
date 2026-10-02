export type Room = {
  id: string;
  name: string;
  location: string;
  description: string;
  price: number;
  image: string;
  tag?: string;
  features: string[];
};

export type NavItem = {
  label: string;
  to: string;
};
