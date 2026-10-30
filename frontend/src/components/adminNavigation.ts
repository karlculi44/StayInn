export const adminNavigationItems = [
  { label: "Overview", to: "/admin", icon: "overview", category: "Main" },
  { label: "Notifications", to: "/admin/notifications", icon: "notifications", category: "Workspace" },
  { label: "Rooms", to: "/admin/rooms", icon: "rooms", category: "Room Management" },
  {
    label: "Room status history",
    to: "/admin/room-status-history",
    icon: "roomStatusHistory",
    category: "Room Management",
  },
  { label: "Room types", to: "/admin/room-types", icon: "roomTypes", category: "Room Management" },
  { label: "Reservations", to: "/admin/reservations", icon: "reservations", category: "Reservations" },
  { label: "Calendar", to: "/admin/calendar", icon: "calendar", category: "Room Management" },
  { label: "Users", to: "/admin/users", icon: "users", category: "User Management" },
] as const;
