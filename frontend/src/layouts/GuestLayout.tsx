import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageTransition from "../components/ui/PageTransition";

export default function GuestLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
