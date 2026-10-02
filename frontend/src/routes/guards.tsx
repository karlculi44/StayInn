import { Outlet } from "react-router-dom";
export function GuestGuard() {
  return <Outlet />;
}
export function AdminGuard() {
  return <Outlet />;
}
