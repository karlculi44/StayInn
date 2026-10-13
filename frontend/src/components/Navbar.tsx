import { Link, NavLink } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { useAuth } from "../context/useAuth";
const links = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "Dashboard", to: "/dashboard" },
];
export default function Navbar() {
  const { user, isLoading } = useAuth();

  return (
    <header className="border-b border-black/5 bg-cream/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link
          to="/"
          className="font-display text-2xl font-bold tracking-tight text-sage"
        >
          stay<span className="text-gold">inn</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-sage" : "text-muted hover:text-sage"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-h-9 min-w-34 items-center justify-end gap-3 sm:min-w-52">
          {!isLoading &&
            (user ? (
              <NavLink
                to="/profile"
                aria-label="View profile"
                title="View profile"
                className="inline-flex size-9 items-center justify-center rounded-full text-ink hover:text-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-5"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.5 20a6.5 6.5 0 0 1 13 0"
                  />
                </svg>
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="hidden text-sm font-semibold text-ink hover:text-sage sm:block"
                >
                  Sign in
                </NavLink>
                <ButtonLink to="/register" className="px-4 py-2">
                  Get started
                </ButtonLink>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
