import { Router } from "express";
import {
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, authorize("GUEST"), getNotifications);
router.patch(
  "/:id/read",
  verifyToken,
  authorize("GUEST"),
  markNotificationAsRead,
);

export default router;
