import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { useAuth } from "../context/useAuth";
import MobileNavMenu from "./ui/MobileNavMenu";
import ProfileDropdown from "./ui/ProfileDropdown";
import ThemeToggle from "./ui/ThemeToggle";
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_UPDATED_EVENT,
} from "../services/notification.service";
const links = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "About", to: "/about" },
  { label: "Dashboard", to: "/dashboard" },
];
export default function Navbar() {
  const { user, isLoading } = useAuth();
  const dashboardPath = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadCountUserId, setUnreadCountUserId] = useState<string>();
  const visibleUnreadCount =
    user?.role === "GUEST" && unreadCountUserId === user.id
      ? unreadNotificationCount
      : 0;

  useEffect(() => {
    if (user?.role !== "GUEST") {
      return;
    }

    let isMounted = true;
    const userId = user.id;
    const refreshUnreadNotificationCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (isMounted) {
          setUnreadNotificationCount(count);
          setUnreadCountUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching unread notification count:", error);
      }
    };

    void refreshUnreadNotificationCount();
    const intervalId = window.setInterval(
      () => void refreshUnreadNotificationCount(),
      60_000,
    );
    window.addEventListener("focus", refreshUnreadNotificationCount);
    window.addEventListener(
      NOTIFICATIONS_UPDATED_EVENT,
      refreshUnreadNotificationCount,
    );

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshUnreadNotificationCount);
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        refreshUnreadNotificationCount,
      );
    };
  }, [user?.id, user?.role]);

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
              <>
                {user.role === "GUEST" && (
                  <Link
                    to="/notifications"
                    aria-label={
                      visibleUnreadCount > 0
                        ? `Notifications, ${visibleUnreadCount} unread`
                        : "Notifications"
                    }
                    title="Notifications"
                    className="relative inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                    >
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                      <path d="M10 21h4" />
                    </svg>
                    {visibleUnreadCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
                      >
                        {visibleUnreadCount > 99
                          ? "99+"
                          : visibleUnreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <ProfileDropdown />
              </>
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
          <MobileNavMenu
            items={links.map((link) => ({
              ...link,
              to: link.label === "Dashboard" ? dashboardPath : link.to,
            }))}
            ariaLabel="Primary navigation"
          />
        </div>
      </div>
    </header>
  );
}
