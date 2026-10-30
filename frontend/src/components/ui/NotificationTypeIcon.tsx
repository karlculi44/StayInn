import type { Notification } from "../../types/notification";

type Props = {
  type: Notification["type"];
  className?: string;
};

export default function NotificationTypeIcon({
  type,
  className = "size-5",
}: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
      {type === "NEW_RESERVATION" ? (
        <path d="M12 13v5m-2.5-2.5h5" />
      ) : (
        <path d="m9 16 2 2 4-4" />
      )}
    </svg>
  );
}
