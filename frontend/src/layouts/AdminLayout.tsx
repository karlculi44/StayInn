import { Outlet, Link, NavLink } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { useAuth } from "../context/useAuth";
import ProfileAvatar from "../components/ui/ProfileAvatar";

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      <header className="fixed inset-x-0 top-0 z-30 flex h-20 items-center justify-between border-b border-black/5 bg-white px-5 lg:px-8">
        <Link to="/" className="font-display text-2xl font-bold text-sage">
          stay<span className="text-gold">inn</span>
        </Link>
        <NavLink
          to="/admin/profile"
          aria-label="View profile"
          title="View profile"
          className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        >
          <ProfileAvatar profilePictureUrl={user?.profilePictureUrl ?? null} />
        </NavLink>
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
