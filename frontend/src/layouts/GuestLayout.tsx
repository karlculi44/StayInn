import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageTransition from "../components/ui/PageTransition";

export default function GuestLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
