import { Link, NavLink, Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import ProfileDropdown from "../components/ui/ProfileDropdown";
import MobileNavMenu from "../components/ui/MobileNavMenu";
import ThemeToggle from "../components/ui/ThemeToggle";
import PageTransition from "../components/ui/PageTransition";
import { primaryNavigationItems } from "../components/primaryNavigation";

const links = [
  ...primaryNavigationItems,
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
          <div className="hidden md:block"><ThemeToggle /></div>
          <div className="hidden md:block"><ProfileDropdown /></div>
          <MobileNavMenu />
        </div>
      </header>
      <div className="pt-20 lg:flex">
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
