import { Router } from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, authorize("GUEST"), getNotifications);
router.get(
  "/unread-count",
  verifyToken,
  authorize("GUEST"),
  getUnreadNotificationCount,
);
router.patch(
  "/read-all",
  verifyToken,
  authorize("GUEST"),
  markAllNotificationsAsRead,
);
router.patch(
  "/:id/read",
  verifyToken,
  authorize("GUEST"),
  markNotificationAsRead,
);

export default router;
