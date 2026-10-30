import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import NotificationTypeIcon from "./NotificationTypeIcon";
import { useAuth } from "../../context/useAuth";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notification.service";
import type { Notification } from "../../types/notification";
import { formatRelativeTime } from "../../utils/format";

type NotificationLinkProps = {
  unreadCount: number;
  onOpen?: () => void | Promise<void>;
};

function getNotificationPath(
  notification: Notification,
  role?: string,
): string | undefined {
  if (
    notification.referenceType !== "RESERVATION" ||
    !notification.referenceId
  ) {
    return undefined;
  }

  return role === "ADMIN"
    ? `/admin/reservations/${notification.referenceId}`
    : `/reservations/${notification.referenceId}`;
}

export default function NotificationLink({
  unreadCount,
  onOpen,
}: NotificationLinkProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const pendingIdsRef = useRef(new Set<string>());
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const isMarkingAllRef = useRef(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const panelHeight = Math.min(448, window.innerHeight - 32);
    const availableBelow = window.innerHeight - rect.bottom - 12;
    setPosition({
      top:
        availableBelow >= Math.min(panelHeight, 280)
          ? rect.bottom + 8
          : Math.max(16, rect.top - panelHeight - 8),
      right: Math.max(16, window.innerWidth - rect.right),
    });
  }, []);

  const loadRecentNotifications = async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setError("");
    setIsLoading(true);
    try {
      setNotifications(await getNotifications({ limit: 5 }));
    } catch {
      setError("Unable to load notifications. Please try again.");
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    updatePosition();
    setIsOpen(true);
    void loadRecentNotifications();
    void onOpen?.();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const handleMarkAsRead = async (id: string) => {
    if (pendingIdsRef.current.has(id)) {
      return;
    }

    pendingIdsRef.current.add(id);
    setPendingIds(new Set(pendingIdsRef.current));
    setError("");
    try {
      const updatedNotification = await markNotificationAsRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? updatedNotification : notification,
        ),
      );
    } catch {
      setError("Unable to update this notification. Please try again.");
    } finally {
      pendingIdsRef.current.delete(id);
      setPendingIds(new Set(pendingIdsRef.current));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRef.current) {
      return;
    }

    isMarkingAllRef.current = true;
    setIsMarkingAllAsRead(true);
    setError("");
    try {
      const result = await markAllNotificationsAsRead();
      setNotifications((current) =>
        current.map((notification) =>
          notification.readAt
            ? notification
            : { ...notification, isRead: true, readAt: result.readAt },
        ),
      );
    } catch {
      setError("Unable to mark all notifications as read. Please try again.");
    } finally {
      isMarkingAllRef.current = false;
      setIsMarkingAllAsRead(false);
    }
  };

  const handleNotificationNavigation = async (
    event: MouseEvent<HTMLAnchorElement>,
    notification: Notification,
    destination: string,
  ) => {
    setIsOpen(false);
    if (notification.readAt) {
      return;
    }

    event.preventDefault();
    setError("");
    try {
      await markNotificationAsRead(notification.id);
      navigate(destination);
    } catch {
      setError("Unable to update this notification. Please try again.");
      setIsOpen(true);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="notification-preview"
        onClick={toggleDropdown}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            id="notification-preview"
            role="dialog"
            aria-label="Recent notifications"
            style={{ top: position.top, right: position.right }}
            className="animate-ui-enter fixed z-50 flex max-h-[min(28rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
              <h2 className="font-display text-xl font-bold text-ink">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={isMarkingAllAsRead}
                  onClick={() => void handleMarkAllAsRead()}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-sage hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:opacity-60"
                >
                  {isMarkingAllAsRead ? "Marking..." : "Mark all as read"}
                </button>
              )}
            </div>
            {error && (
              <p role="alert" className="px-5 pt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="min-h-24 flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <p className="px-5 py-8 text-center text-sm text-muted">
                  Loading notifications...
                </p>
            ) : error ? (
              <div className="px-5 py-6 text-center">
                <button
                  type="button"
                  onClick={() => void loadRecentNotifications()}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-sage hover:bg-sage/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">
                  You&apos;re all caught up.
                </p>
              ) : (
                <ul className="divide-y divide-black/10">
                  {notifications.map((notification) => {
                    const destination = getNotificationPath(
                      notification,
                      user?.role,
                    );
                    const content = (
                      <>
                        <span className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${notification.isRead ? "bg-black/5 text-muted" : "bg-sage/15 text-sage"}`}
                          >
                            <NotificationTypeIcon type={notification.type} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">
                              {notification.title}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-sm leading-5 text-muted">
                              {notification.message}
                            </span>
                            <time
                              className="mt-2 block text-xs text-muted"
                              dateTime={notification.createdAt}
                            >
                              {formatRelativeTime(notification.createdAt)}
                            </time>
                          </span>
                        </span>
                      </>
                    );

                    return (
                      <li
                        key={notification.id}
                        className={
                          notification.readAt
                            ? "px-5 py-4"
                            : "bg-sage/5 px-5 py-4"
                        }
                      >
                        {destination ? (
                          <Link
                            to={destination}
                            onClick={(event) =>
                              void handleNotificationNavigation(
                                event,
                                notification,
                                destination,
                              )
                            }
                            className="block rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                          >
                            {content}
                          </Link>
                        ) : notification.readAt ? (
                          <div>{content}</div>
                        ) : (
                          <button
                            type="button"
                            disabled={pendingIds.has(notification.id)}
                            onClick={() =>
                              void handleMarkAsRead(notification.id)
                            }
                            className="block w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:opacity-60"
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <Link
              to={user?.role === "ADMIN" ? "/admin/notifications" : "/dashboard/notifications"}
              onClick={() => setIsOpen(false)}
              className="border-t border-black/10 px-5 py-3 text-center text-sm font-semibold text-sage hover:bg-sage/5 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-sage"
            >
              View all notifications
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}
