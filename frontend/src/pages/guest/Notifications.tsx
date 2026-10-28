import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Loading } from "../../components/ui/States";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notification.service";
import type { Notification } from "../../types/notification";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        if (isMounted) {
          setNotifications(data);
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
  }, [retryCount]);

  const handleRetry = () => {
    setError("");
    setIsLoading(true);
    setRetryCount((count) => count + 1);
  };

  const handleMarkAsRead = async (id: string) => {
    setActionError("");
    try {
      const updatedNotification = await markNotificationAsRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? updatedNotification : notification,
        ),
      );
    } catch {
      setActionError("Unable to update this notification. Please try again.");
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionError("");
    setIsMarkingAllAsRead(true);
    try {
      const result = await markAllNotificationsAsRead();
      setNotifications((current) =>
        current.map((notification) =>
          notification.readAt
            ? notification
            : { ...notification, readAt: result.readAt },
        ),
      );
    } catch {
      setActionError("Unable to mark all notifications as read. Please try again.");
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.readAt,
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Notifications</h1>
          <p className="mt-3 text-muted">
            Updates about your reservations will appear here.
          </p>
        </div>
        {!isLoading && !error && hasUnreadNotifications && (
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

      <div className="mt-8 space-y-4">
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
            title="You're all caught up"
            message="Reservation updates will appear here when they are available."
          />
        )}

        {!isLoading && !error && actionError && (
          <ErrorState message={actionError} />
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <ul className="divide-y divide-black/10 border-y border-black/10">
            {notifications.map((notification) => (
              <li key={notification.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-ink">
                        {notification.title}
                      </h2>
                      {!notification.readAt && (
                        <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-white">
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
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                    {notification.reservationId && (
                      <Link
                        to={`/reservations/${notification.reservationId}`}
                        className="mt-3 inline-block text-sm font-semibold text-sage hover:text-sage-dark"
                      >
                        View reservation
                      </Link>
                    )}
                  </div>
                  {!notification.readAt && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-4 py-2"
                      onClick={() => void handleMarkAsRead(notification.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
