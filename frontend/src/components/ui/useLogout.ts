import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/");
      return true;
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      return false;
    } finally {
      setIsLoggingOut(false);
    }
  }

  return { handleLogout, isLoggingOut, logoutError, setLogoutError };
}
