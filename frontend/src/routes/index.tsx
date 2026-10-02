import { Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import GuestLayout from "../layouts/GuestLayout";
import AdminLayout from "../layouts/AdminLayout";
import { AdminGuard, GuestGuard } from "./guards";
import { AdminPage, AuthPage, DashboardPage, GuestPage, HomePage, RoomDetailPage, RoomsPage } from "../pages/Pages";

export default function AppRoutes() {
  return <Routes>
    <Route element={<PublicLayout />}><Route path="/" element={<HomePage />} /><Route path="/rooms" element={<RoomsPage />} /><Route path="/rooms/:id" element={<RoomDetailPage />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage register />} /></Route>
    <Route element={<GuestGuard />}><Route element={<GuestLayout />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/reservations" element={<GuestPage title="Reservations" />} /><Route path="/reservations/:id" element={<GuestPage title="Reservation details" />} /><Route path="/profile" element={<GuestPage title="Your profile" />} /></Route></Route>
    <Route element={<AdminGuard />}><Route element={<AdminLayout />}><Route path="/admin" element={<AdminPage />} /><Route path="/admin/rooms" element={<AdminPage title="Rooms" />} /><Route path="/admin/room-types" element={<AdminPage title="Room types" />} /><Route path="/admin/reservations" element={<AdminPage title="Reservations" />} /><Route path="/admin/users" element={<AdminPage title="Guests" />} /></Route></Route>
  </Routes>;
}