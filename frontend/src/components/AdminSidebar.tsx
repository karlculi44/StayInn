import { NavLink } from "react-router-dom";
import { adminNavigationItems } from "./adminNavigation";

type AdminNavIconName = (typeof adminNavigationItems)[number]["icon"];

export function AdminNavIcon({ name }: { name: AdminNavIconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2 inline size-4 shrink-0 align-[-3px]"
    >
      {name === "overview" && (
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
        </>
      )}
      {name === "rooms" && (
        <>
          <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
          <path d="M3 16h18M5 11V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4" />
          <path d="M12 11V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 18v2m18-2v2" />
        </>
      )}
      {name === "roomStatusHistory" && (
        <>
          <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
          <path d="M3 3v5h5m4-1v5l3 2" />
        </>
      )}
      {name === "roomTypes" && (
        <>
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21v-8h6v8M7 9h.01M12 9h.01M17 9h.01" />
        </>
      )}
      {name === "reservations" && (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V3h6v1m-7 6h8m-8 4h8m-8 4h5" />
        </>
      )}
      {name === "calendar" && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </>
      )}
      {name === "users" && (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
        </>
      )}
    </svg>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="hidden w-full shrink-0 border-b border-black/5 bg-white p-4 md:block lg:fixed lg:inset-y-0 lg:left-0 lg:top-20 lg:z-20 lg:flex lg:h-[calc(100vh-80px)] lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-6">
      <p className="mb-5 px-3 text-xs font-bold uppercase tracking-widest text-muted">
        Management
      </p>
      <nav
        aria-label="Admin management"
        className="flex gap-1 overflow-x-auto lg:grid"
      >
        {adminNavigationItems.map((item) => (
          <NavLink
            end={item.to === "/admin"}
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-sage text-white" : "text-muted hover:bg-cream hover:text-ink"}`
            }
          >
            <AdminNavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
