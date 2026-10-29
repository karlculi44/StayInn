import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, matchPath, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { adminNavigationItems } from "../adminNavigation";
import { guestNavigationItems } from "../guestNavigation";
import { primaryNavigationItems } from "../primaryNavigation";
import { AdminNavIcon } from "../AdminSidebar";
import { GuestNavIcon } from "../GuestDashboardSidebar";
import NotificationLink from "./NotificationLink";
import ThemeToggle from "./ThemeToggle";
import { useLogout } from "./useLogout";

type NavItem = {
  label: string;
  to: string;
  end?: boolean;
  icon?: ReactNode;
  alternatePattern?: string;
};
type NavGroup = { label: string; items: NavItem[] };

function isItemActive(item: NavItem, pathname: string) {
  return Boolean(
    matchPath({ path: item.to, end: item.end ?? false }, pathname) ||
      (item.alternatePattern && matchPath(item.alternatePattern, pathname)),
  );
}

function getGroups(role?: string): NavGroup[] {
  const main: NavItem[] = [...primaryNavigationItems];
  if (role === "ADMIN") {
    const publicLinks = main.map((item) =>
      item.to === "/rooms" ? { ...item, label: "Browse rooms" } : item,
    );
    const adminItems = adminNavigationItems.map((item) => ({
      ...item,
      end: item.to === "/admin",
      icon: <AdminNavIcon name={item.icon} />,
    }));
    return [
      { label: "Main", items: [...publicLinks, ...adminItems.filter((item) => item.category === "Main")] },
      ...(["Room Management", "Reservations", "User Management"] as const).map((label) => ({
        label,
        items: adminItems.filter((item) => item.category === label),
      })),
      { label: "Account", items: [{ label: "My Profile", to: "/admin/profile" }] },
    ];
  }
  if (role === "GUEST") {
    const guestItems = guestNavigationItems.map((item) => ({
      ...item,
      icon: <GuestNavIcon name={item.icon} />,
      alternatePattern: item.to === "/dashboard/reservations" ? "/reservations/:id" : undefined,
    }));
    return [
      { label: "Main", items: main },
      { label: "My Stay", items: guestItems.filter((item) => item.to !== "/dashboard/profile") },
      { label: "Account", items: guestItems.filter((item) => item.to === "/dashboard/profile") },
    ];
  }
  return [
    { label: "Main", items: [...main, { label: "Dashboard", to: "/dashboard", end: true }] },
    { label: "Account", items: [{ label: "Sign in", to: "/login" }, { label: "Get started", to: "/register" }] },
  ];
}

export default function MobileNavMenu({ unreadCount = 0 }: { unreadCount?: number }) {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<{ pathname: string; groups: Record<string, boolean> }>({ pathname, groups: {} });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { handleLogout, isLoggingOut, logoutError, setLogoutError } = useLogout();
  const groups = getGroups(user?.role);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const media = window.matchMedia("(min-width: 768px)");
    const onResize = () => {
      if (media.matches) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      } else if (event.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => !element.closest("[inert]") && element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !drawerRef.current.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current.contains(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onResize);
    onResize();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onResize);
      if (menuButton?.getClientRects().length) menuButton.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button ref={menuButtonRef} type="button" aria-label="Open navigation menu" aria-expanded={isOpen} aria-controls="mobile-primary-navigation" onClick={() => { setLogoutError(""); setIsOpen(true); }} className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage md:hidden">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => setIsOpen(false)} />
          <div ref={drawerRef} id="mobile-primary-navigation" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title" className="mobile-drawer absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2rem))] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <span id="mobile-navigation-title" className="font-display text-2xl font-bold text-sage">Navigation</span>
              <button ref={closeRef} type="button" aria-label="Close navigation menu" onClick={() => setIsOpen(false)} className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <nav aria-label="Mobile navigation" className="grid gap-1">
                {groups.map((group) => {
                  const active = group.items.some((item) => isItemActive(item, pathname));
                  const override = expanded.pathname === pathname ? expanded.groups[group.label] : undefined;
                  const open = override ?? active;
                  return (
                    <section key={group.label}>
                      <button type="button" aria-expanded={open} aria-controls={`mobile-group-${group.label.replace(/\s+/g, "-")}`} onClick={() => setExpanded({ pathname, groups: { ...(expanded.pathname === pathname ? expanded.groups : {}), [group.label]: !open } })} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage">
                        {group.label}
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                      <div id={`mobile-group-${group.label.replace(/\s+/g, "-")}`} className={`mobile-nav-collapse ${open ? "is-open" : ""}`} inert={!open}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="grid gap-1 pb-2 pl-3">
                            {group.items.map((item) => {
                              const selected = isItemActive(item, pathname);
                              return <Link key={item.to} to={item.to} aria-current={selected ? "page" : undefined} onClick={() => setIsOpen(false)} className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${selected ? "bg-sage font-bold text-white" : "text-muted hover:bg-cream hover:text-ink"}`}>{item.icon}{item.label}{selected && <span aria-hidden="true" className="ml-auto">•</span>}</Link>;
                            })}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </nav>
              <div className="mt-4 flex items-center gap-3 border-t border-black/10 pt-4">
                <ThemeToggle />
                <span className="text-sm text-muted">Appearance</span>
                {user?.role === "GUEST" && <div className="ml-auto"><NotificationLink unreadCount={unreadCount} highlightActive onClick={() => setIsOpen(false)} /></div>}
              </div>
              {!isLoading && user && (
                <div className="mt-4 border-t border-black/10 pt-4">
                  <button type="button" disabled={isLoggingOut} onClick={() => void handleLogout().then((success) => setIsOpen(!success))} className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage">{isLoggingOut ? "Logging out..." : "Logout"}</button>
                  {logoutError && <p role="alert" className="px-3 py-2 text-xs text-red-700">{logoutError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
