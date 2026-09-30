import { Router } from "express";
import { getDashboardStats } from "../controllers/admin.controller.js";
import { authorize, verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/dashboard", verifyToken, authorize("ADMIN"), getDashboardStats);

export default router;
