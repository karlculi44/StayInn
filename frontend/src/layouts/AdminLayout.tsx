import { Outlet, Link } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import ProfileDropdown from "../components/ui/ProfileDropdown";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="fixed inset-x-0 top-0 z-30 flex h-20 items-center justify-between border-b border-black/5 bg-white px-5 lg:px-8">
        <Link to="/" className="font-display text-2xl font-bold text-sage">
          stay<span className="text-gold">inn</span>
        </Link>
        <ProfileDropdown />
      </header>
      <div className="pt-20 lg:flex">
        <AdminSidebar />
        <main className="min-w-0 flex-1 p-5 lg:ml-64 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
