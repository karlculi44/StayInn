import type { Room } from "../types";

export const rooms: Room[] = [
  {
    id: "garden-suite",
    roomNumber: "101",
    name: "The Garden Suite",
    roomType: "Suite",
    description:
      "A sun-filled retreat with a private garden and a deep soaking tub.",
    capacity: 2,
    pricePerNight: 240,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    tag: "Guest favourite",
    features: ["King bed", "Private garden", "Breakfast included"],
  },
  {
    id: "coastal-loft",
    roomNumber: "204",
    name: "Coastal Loft",
    roomType: "Deluxe Room",
    description:
      "Quiet mornings, salt air, and a view that makes you want to stay longer.",
    capacity: 3,
    pricePerNight: 310,
    status: "Available",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    features: ["Ocean view", "Fireplace", "Workspace"],
  },
  {
    id: "city-studio",
    roomNumber: "305",
    name: "City Studio",
    roomType: "Studio",
    description:
      "A considered city base with everything you need to settle in.",
    capacity: 2,
    pricePerNight: 185,
    status: "Occupied",
    image:
      "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80",
    features: ["King bed", "Kitchenette", "Self check-in"],
  },
];
