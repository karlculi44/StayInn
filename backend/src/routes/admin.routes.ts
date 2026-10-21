import { Router } from "express";
import {
  getDashboardStats,
  getMonthlyBookingTrends,
  getRoomStatusHistory,
} from "../controllers/admin.controller.js";
import { authorize, verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/dashboard", verifyToken, authorize("ADMIN"), getDashboardStats);
router.get(
  "/dashboard/monthly-booking-trends",
  verifyToken,
  authorize("ADMIN"),
  getMonthlyBookingTrends,
);
router.get(
  "/room-status-history",
  verifyToken,
  authorize("ADMIN"),
  getRoomStatusHistory,
);

export default router;
