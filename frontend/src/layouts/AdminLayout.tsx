import { Outlet, Link, NavLink } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import ProfileDropdown from "../components/ui/ProfileDropdown";
import ThemeToggle from "../components/ui/ThemeToggle";
import PageTransition from "../components/ui/PageTransition";

const links = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "Dashboard", to: "/admin" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="fixed inset-x-0 top-0 z-30 flex h-20 items-center justify-between border-b border-black/5 bg-white px-5 lg:px-8">
        <Link to="/" className="font-display text-2xl font-bold text-sage">
          stay<span className="text-gold">inn</span>
        </Link>
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              end
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-sage" : "text-muted hover:text-sage"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ProfileDropdown />
        </div>
        <nav
          aria-label="Primary navigation"
          className="absolute inset-x-0 top-20 flex gap-6 overflow-x-auto border-t border-black/5 bg-white px-5 py-3 md:hidden"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              end
              to={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap text-sm font-medium ${isActive ? "text-sage" : "text-muted hover:text-sage"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="pt-32 lg:flex lg:pt-20">
        <AdminSidebar />
        <main className="min-w-0 flex-1 p-5 lg:ml-64 lg:p-10">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
