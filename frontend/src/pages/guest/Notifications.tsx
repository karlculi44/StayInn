import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import { useAuth } from "../../context/useAuth";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notification.service";
import type { Notification } from "../../types/notification";
import { formatRelativeTime } from "../../utils/format";

const PAGE_SIZE = 20;

function NotificationTypeIcon({ type }: { type: Notification["type"] }) {
  if (type === "RESERVATION_STATUS_UPDATED") {
    return (
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
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    );
  }

  return (
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
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const pendingIdsRef = useRef(new Set<string>());
  const markingAllRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      setIsLoading(true);
      setError("");
      setNotifications([]);
      setHasMore(false);
      try {
        const data = await getNotifications({
          limit: PAGE_SIZE + 1,
          offset: 0,
          unreadOnly: filter === "unread",
        });
        if (isMounted) {
          setNotifications(data.slice(0, PAGE_SIZE));
          setHasMore(data.length > PAGE_SIZE);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load your notifications. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [filter, retryCount]);

  const handleRetry = () => {
    setError("");
    setRetryCount((count) => count + 1);
  };

  const handleMarkAsRead = async (id: string) => {
    if (pendingIdsRef.current.has(id)) {
      return;
    }

    pendingIdsRef.current.add(id);
    setPendingIds(new Set(pendingIdsRef.current));
    setActionError("");
    try {
      const updatedNotification = await markNotificationAsRead(id);
      if (filter === "unread") {
        setRetryCount((count) => count + 1);
      } else {
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === id ? updatedNotification : notification,
          ),
        );
      }
    } catch {
      setActionError(
        "Unable to update this notification. Please try again.",
      );
    } finally {
      pendingIdsRef.current.delete(id);
      setPendingIds(new Set(pendingIdsRef.current));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAllRef.current) {
      return;
    }

    markingAllRef.current = true;
    setIsMarkingAllAsRead(true);
    setActionError("");
    try {
      const result = await markAllNotificationsAsRead();
      setNotifications((current) =>
        filter === "unread"
          ? []
          : current.map((notification) =>
              notification.readAt
                ? notification
                : { ...notification, readAt: result.readAt },
            ),
      );
      if (filter === "unread") {
        setHasMore(false);
      }
    } catch {
      setActionError(
        "Unable to mark all notifications as read. Please try again.",
      );
    } finally {
      markingAllRef.current = false;
      setIsMarkingAllAsRead(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setActionError("");
    try {
      const data = await getNotifications({
        limit: PAGE_SIZE + 1,
        offset: notifications.length,
        unreadOnly: filter === "unread",
      });
      setNotifications((current) => [
        ...current,
        ...data.slice(0, PAGE_SIZE),
      ]);
      setHasMore(data.length > PAGE_SIZE);
    } catch {
      setActionError("Unable to load older notifications. Please try again.");
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const getReservationPath = (notification: Notification) => {
    if (!notification.reservationId) {
      return undefined;
    }

    return user?.role === "ADMIN"
      ? `/admin/reservations/${notification.reservationId}`
      : `/reservations/${notification.reservationId}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Notifications</h1>
          <p className="mt-3 text-muted">
            Updates tied to your account will appear here.
          </p>
        </div>
        {!isLoading && !error && (
          <Button
            type="button"
            variant="secondary"
            disabled={isMarkingAllAsRead}
            onClick={() => void handleMarkAllAsRead()}
          >
            {isMarkingAllAsRead ? "Marking as read..." : "Mark all as read"}
          </Button>
        )}
      </div>

      <div
        className="mt-7 flex gap-2"
        role="group"
        aria-label="Filter notifications"
      >
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setActionError("");
            }}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${
              filter === value
                ? "bg-sage text-white"
                : "text-muted hover:bg-sage/10 hover:text-ink"
            }`}
          >
            {value === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {isLoading && <Loading label="Loading notifications..." />}

        {!isLoading && error && (
          <div className="space-y-4">
            <ErrorState message={error} />
            <div className="text-center">
              <Button type="button" variant="secondary" onClick={handleRetry}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <EmptyState
            title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
            message={
              filter === "unread"
                ? "You have no unread notifications."
                : "Updates tied to your account will appear here when available."
            }
          />
        )}

        {!isLoading && !error && actionError && (
          <ErrorState message={actionError} />
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <ul className="divide-y divide-black/10 border-y border-black/10">
            {notifications.map((notification) => {
              const reservationPath = getReservationPath(notification);
              return (
                <li
                  key={notification.id}
                  className={`py-5 ${notification.readAt ? "" : "bg-sage/5"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 px-3 sm:px-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
                          notification.readAt
                            ? "bg-black/5 text-muted"
                            : "bg-sage/15 text-sage"
                        }`}
                      >
                        <NotificationTypeIcon type={notification.type} />
                      </span>
                      <div className="min-w-0 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className={`text-base text-ink ${
                              notification.readAt
                                ? "font-medium"
                                : "font-bold"
                            }`}
                          >
                            {notification.title}
                          </h2>
                          {!notification.readAt && (
                            <span className="rounded-full bg-sage/15 px-2 py-0.5 text-xs font-semibold text-sage">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {notification.message}
                        </p>
                        <time
                          className="mt-3 block text-xs text-muted"
                          dateTime={notification.createdAt}
                        >
                          {formatRelativeTime(notification.createdAt)}
                        </time>
                        {reservationPath && (
                          <Link
                            to={reservationPath}
                            onClick={() => {
                              if (!notification.readAt) {
                                void handleMarkAsRead(notification.id);
                              }
                            }}
                            className="mt-3 inline-block rounded-sm text-sm font-semibold text-sage hover:text-sage-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                          >
                            View reservation
                          </Link>
                        )}
                      </div>
                    </div>
                    {!notification.readAt && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-4 py-2"
                        disabled={
                          isMarkingAllAsRead || pendingIds.has(notification.id)
                        }
                        onClick={() =>
                          void handleMarkAsRead(notification.id)
                        }
                      >
                        {pendingIds.has(notification.id)
                          ? "Marking..."
                          : "Mark as read"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && !error && hasMore && (
          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="secondary"
              disabled={isLoadingMore}
              onClick={() => void handleLoadMore()}
            >
              {isLoadingMore ? "Loading..." : "Load older notifications"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
