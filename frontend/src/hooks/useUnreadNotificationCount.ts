import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_UPDATED_EVENT,
} from "../services/notification.service";

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const [unreadCount, setUnreadCount] = useState(0);
  const [countUserId, setCountUserId] = useState<string>();
  const requestSequenceRef = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId || (role !== "GUEST" && role !== "ADMIN")) {
      return;
    }

    const requestSequence = ++requestSequenceRef.current;
    try {
      const count = await getUnreadNotificationCount();
      if (requestSequence === requestSequenceRef.current) {
        setUnreadCount(count);
        setCountUserId(userId);
      }
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
    }
  }, [role, userId]);

  useEffect(() => {
    if (!userId || (role !== "GUEST" && role !== "ADMIN")) {
      return;
    }

    let isMounted = true;
    const fetchUnreadCount = async () => {
      const requestSequence = ++requestSequenceRef.current;
      try {
        const count = await getUnreadNotificationCount();
        if (isMounted && requestSequence === requestSequenceRef.current) {
          setUnreadCount(count);
          setCountUserId(userId);
        }
      } catch (error) {
        console.error("Error fetching unread notification count:", error);
      }
    };

    void fetchUnreadCount();
    const intervalId = window.setInterval(
      () => void fetchUnreadCount(),
      60_000,
    );
    window.addEventListener("focus", fetchUnreadCount);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchUnreadCount);

    return () => {
      isMounted = false;
      requestSequenceRef.current += 1;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchUnreadCount);
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        fetchUnreadCount,
      );
    };
  }, [role, userId]);

  return {
    unreadCount:
      userId && (role === "GUEST" || role === "ADMIN") && countUserId === userId
        ? unreadCount
        : 0,
    refreshUnreadCount,
  };
}
