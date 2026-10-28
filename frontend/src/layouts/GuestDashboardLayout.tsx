import { Outlet } from "react-router-dom";
import GuestDashboardSidebar from "../components/GuestDashboardSidebar";

export default function GuestDashboardLayout() {
  return (
    <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <GuestDashboardSidebar />
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
}
