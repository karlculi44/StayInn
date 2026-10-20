import { Route, Routes } from "react-router-dom";
import { AdminGuard, GuestGuard } from "./guards";
import PublicLayout from "../layouts/PublicLayout";
import GuestLayout from "../layouts/GuestLayout";
import AdminLayout from "../layouts/AdminLayout";
import Home from "../pages/public/Home";
import Rooms from "../pages/public/Rooms";
import RoomDetails from "../pages/public/RoomDetails";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";
import GuestDashboard from "../pages/guest/Dashboard";
import GuestReservations from "../pages/guest/Reservations";
import ReservationDetails from "../pages/guest/ReservationDetails";
import Profile from "../pages/guest/Profile";
import AdminPage from "../pages/admin/Dashboard";
import AdminRooms from "../pages/admin/Rooms";
import RoomTypes from "../pages/admin/RoomTypes";
import AdminReservations from "../pages/admin/Reservations";
import Users from "../pages/admin/Users";
import RoomStatusHistory from "../pages/admin/RoomStatusHistory";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:id" element={<RoomDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<GuestGuard />}>
        <Route element={<GuestLayout />}>
          <Route path="/dashboard" element={<GuestDashboard />} />
          <Route path="/reservations" element={<GuestReservations />} />
          <Route path="/reservations/:id" element={<ReservationDetails />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/rooms" element={<AdminRooms />} />
          <Route
            path="/admin/room-status-history"
            element={<RoomStatusHistory />}
          />
          <Route path="/admin/room-types" element={<RoomTypes />} />
          <Route path="/admin/reservations" element={<AdminReservations />} />
          <Route path="/admin/users" element={<Users />} />
        </Route>
      </Route>
    </Routes>
  );
}
