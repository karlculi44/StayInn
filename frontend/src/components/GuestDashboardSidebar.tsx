import { NavLink } from "react-router-dom";

const items = [
  { label: "Overview", to: "/dashboard", icon: "overview", end: true },
  {
    label: "My Reservations",
    to: "/dashboard/reservations",
    icon: "reservations",
    end: false,
  },
  {
    label: "My Profile",
    to: "/dashboard/profile",
    icon: "profile",
    end: false,
  },
] as const;

function GuestNavIcon({ name }: { name: (typeof items)[number]["icon"] }) {
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
      {name === "reservations" && (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4V3h6v1m-7 6h8m-8 4h8m-8 4h5" />
        </>
      )}
      {name === "profile" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
    </svg>
  );
}

export default function GuestDashboardSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-black/10 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-5">
      <nav aria-label="Guest dashboard" className="grid gap-1">
        {items.map((item) => (
          <NavLink
            end={item.end}
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${
                isActive
                  ? "bg-sage text-white"
                  : "text-muted hover:bg-white hover:text-ink"
              }`
            }
          >
            <GuestNavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
