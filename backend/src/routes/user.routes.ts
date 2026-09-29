import { Router } from "express";
import { getUsers, getUserById } from "../controllers/user.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, authorize("ADMIN"), getUsers);
router.get("/:id", verifyToken, authorize("ADMIN"), getUserById);

export default router;
