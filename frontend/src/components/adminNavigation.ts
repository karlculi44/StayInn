export const adminNavigationItems = [
  { label: "Overview", to: "/admin", icon: "overview" },
  { label: "Rooms", to: "/admin/rooms", icon: "rooms" },
  {
    label: "Room status history",
    to: "/admin/room-status-history",
    icon: "roomStatusHistory",
  },
  { label: "Room types", to: "/admin/room-types", icon: "roomTypes" },
  { label: "Reservations", to: "/admin/reservations", icon: "reservations" },
  { label: "Calendar", to: "/admin/calendar", icon: "calendar" },
  { label: "Users", to: "/admin/users", icon: "users" },
] as const;
