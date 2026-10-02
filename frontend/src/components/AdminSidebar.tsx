import { NavLink } from "react-router-dom";
const items = [
  { label: "Overview", to: "/admin" },
  { label: "Rooms", to: "/admin/rooms" },
  { label: "Room types", to: "/admin/room-types" },
  { label: "Reservations", to: "/admin/reservations" },
  { label: "Guests", to: "/admin/users" },
];
export default function AdminSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-black/5 bg-white p-4 lg:min-h-[calc(100vh-80px)] lg:w-64 lg:border-b-0 lg:border-r lg:p-6">
      <p className="mb-5 px-3 text-xs font-bold uppercase tracking-widest text-muted">
        Management
      </p>
      <nav className="flex gap-1 overflow-x-auto lg:grid">
        {items.map((item) => (
          <NavLink
            end={item.to === "/admin"}
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-sage text-white" : "text-muted hover:bg-cream hover:text-ink"}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
