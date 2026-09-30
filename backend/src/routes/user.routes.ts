import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
} from "../controllers/user.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateUserRoleSchema } from "../schemas/user.schema.js";

const router = Router();

router.get("/", verifyToken, authorize("ADMIN"), getUsers);
router.get("/:id", verifyToken, authorize("ADMIN"), getUserById);
router.patch(
  "/:id/role",
  verifyToken,
  authorize("ADMIN"),
  validate(updateUserRoleSchema),
  updateUserRole,
);

export default router;
