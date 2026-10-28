import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import ProfileAvatar from "./ProfileAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  if (!user) {
    return null;
  }

  const profilePath =
    user.role === "ADMIN" ? "/admin/profile" : "/dashboard/profile";

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      setIsOpen(false);
      navigate("/");
    } catch {
      setIsOpen(true);
      setLogoutError("Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setLogoutError("");
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          title="Profile menu"
          className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        >
          <ProfileAvatar profilePictureUrl={user.profilePictureUrl} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label="Profile options">
        <DropdownMenuItem asChild>
          <Link to={profilePath}>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.6-1 1.7 1.7 0 0 0-.9.3l-.2.1L6.8 17l.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 1-1.6 1.7 1.7 0 0 0-.3-.9l-.1-.2L9 5.8l.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.6 1 1.7 1.7 0 0 0 .9-.3l.2-.1L19.2 8l-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1v3.4z" />
            </svg>
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isLoggingOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0"
          >
            <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
            <path d="M3 12h11m0 0-4-4m4 4-4 4" />
            <path d="M13 4v4m0 8v4" />
          </svg>
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </DropdownMenuItem>
        {logoutError && (
          <p role="alert" className="px-3 py-2 text-xs text-red-700">
            {logoutError}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
