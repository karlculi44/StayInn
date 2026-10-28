import { Link, NavLink } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { useAuth } from "../context/useAuth";
import ProfileDropdown from "./ui/ProfileDropdown";
import ThemeToggle from "./ui/ThemeToggle";
const links = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "About", to: "/about" },
  { label: "Dashboard", to: "/dashboard" },
];
export default function Navbar() {
  const { user, isLoading } = useAuth();
  const dashboardPath = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-cream/95">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center px-5 py-5 md:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          to="/"
          className="font-display text-2xl font-bold tracking-tight text-sage"
        >
          stay<span className="text-gold">inn</span>
        </Link>
        <nav className="hidden items-center justify-self-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.label}
              to={link.label === "Dashboard" ? dashboardPath : link.to}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-sage" : "text-muted hover:text-sage"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-h-9 items-center justify-self-end gap-3 sm:min-w-52">
          <ThemeToggle />
          {!isLoading &&
            (user ? (
              <ProfileDropdown />
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
