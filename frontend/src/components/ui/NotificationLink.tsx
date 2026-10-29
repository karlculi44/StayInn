import { NavLink } from "react-router-dom";

export default function NotificationLink({
  unreadCount,
  onClick,
  highlightActive = false,
}: {
  unreadCount: number;
  onClick?: () => void;
  highlightActive?: boolean;
}) {
  return (
    <NavLink
      to="/notifications"
      onClick={onClick}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      title="Notifications"
      className={({ isActive }) => `relative inline-flex size-10 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${isActive && highlightActive ? "bg-sage text-white" : "text-ink hover:bg-sage/10"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      {unreadCount > 0 && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </NavLink>
  );
}
