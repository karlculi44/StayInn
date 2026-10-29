import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { useAuth } from "../context/useAuth";
import MobileNavMenu from "./ui/MobileNavMenu";
import ProfileDropdown from "./ui/ProfileDropdown";
import ThemeToggle from "./ui/ThemeToggle";
import NotificationLink from "./ui/NotificationLink";
import { primaryNavigationItems } from "./primaryNavigation";
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_UPDATED_EVENT,
} from "../services/notification.service";
const links = [
  ...primaryNavigationItems,
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
                `text-sm font-medium ${isActive ? "text-sage" : "text-muted hover:text-sage"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex min-h-9 items-center justify-self-end gap-3 sm:min-w-52">
          <div className="hidden md:block"><ThemeToggle /></div>
          {!isLoading &&
            (user ? (
              <>
                {user.role === "GUEST" && <div className="hidden md:block"><NotificationLink unreadCount={visibleUnreadCount} /></div>}
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
          <MobileNavMenu unreadCount={visibleUnreadCount} />
        </div>
      </div>
    </header>
  );
}
