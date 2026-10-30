import { Router } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, authorize("GUEST", "ADMIN"), getNotifications);
router.get(
  "/unread-count",
  verifyToken,
  authorize("GUEST", "ADMIN"),
  getUnreadNotificationCount,
);
router.patch(
  "/read-all",
  verifyToken,
  authorize("GUEST", "ADMIN"),
  markAllNotificationsAsRead,
);
router.patch(
  "/:id/read",
  verifyToken,
  authorize("GUEST", "ADMIN"),
  markNotificationAsRead,
);

export default router;
