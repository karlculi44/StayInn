import { Link, NavLink } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { useAuth } from "../context/useAuth";
import ProfileAvatar from "./ui/ProfileAvatar";
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
                to={user.role === "ADMIN" ? "/admin/profile" : "/profile"}
                aria-label="View profile"
                title="View profile"
                className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
              >
                <ProfileAvatar profilePictureUrl={user.profilePictureUrl} />
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
