import { Router } from "express";
import {
  getDashboardStats,
  getRoomStatusHistory,
} from "../controllers/admin.controller.js";
import { authorize, verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/dashboard", verifyToken, authorize("ADMIN"), getDashboardStats);
router.get(
  "/room-status-history",
  verifyToken,
  authorize("ADMIN"),
  getRoomStatusHistory,
);

export default router;
