export const guestNavigationItems = [
  { label: "Overview", to: "/dashboard", icon: "overview", end: true },
  { label: "My Reservations", to: "/dashboard/reservations", icon: "reservations", end: false },
  { label: "My Profile", to: "/dashboard/profile", icon: "profile", end: false },
] as const;
