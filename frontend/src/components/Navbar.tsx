import { Link, NavLink } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { useAuth } from "../context/useAuth";
import MobileNavMenu from "./ui/MobileNavMenu";
import ProfileDropdown from "./ui/ProfileDropdown";
import ThemeToggle from "./ui/ThemeToggle";
import NotificationLink from "./ui/NotificationLink";
import { primaryNavigationItems } from "./primaryNavigation";
import PrimaryNavIcon from "./PrimaryNavIcon";
import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount";
const links = [
  ...primaryNavigationItems,
  { label: "Dashboard", to: "/dashboard", icon: "dashboard" },
] as const;
export default function Navbar() {
  const { user, isLoading } = useAuth();
  const dashboardPath = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const { unreadCount, refreshUnreadCount } = useUnreadNotificationCount();

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-cream/95">
      <div className="grid w-full grid-cols-[1fr_auto] items-center px-4 py-5 sm:px-6 md:grid-cols-[1fr_auto_1fr] lg:px-8">
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
                `flex items-center text-sm font-medium ${isActive ? "text-sage" : "text-muted hover:text-sage"}`
              }
            >
              <PrimaryNavIcon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-h-9 items-center justify-self-end gap-3 sm:min-w-52">
          <div className="hidden md:block"><ThemeToggle /></div>
          {!isLoading &&
            (user ? (
              <>
                <div className="hidden md:block">
                  <NotificationLink
                    unreadCount={unreadCount}
                    onOpen={refreshUnreadCount}
                  />
                </div>
                <div className="hidden md:block"><ProfileDropdown /></div>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="hidden text-sm font-semibold text-ink hover:text-sage md:block"
                >
                  Sign in
                </NavLink>
                <div className="hidden md:block"><ButtonLink to="/register" className="px-4 py-2">Get started</ButtonLink></div>
              </>
            ))}
          <MobileNavMenu />
        </div>
      </div>
    </header>
  );
}
