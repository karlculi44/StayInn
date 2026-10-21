import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  getUserProfilePicture,
  updateUserRole,
  deleteUser,
} from "../controllers/user.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createUserSchema,
  updateUserRoleSchema,
} from "../schemas/user.schema.js";

const router = Router();

router.post(
  "/",
  verifyToken,
  authorize("ADMIN"),
  validate(createUserSchema),
  createUser,
);
router.get("/", verifyToken, authorize("ADMIN"), getUsers);
router.get(
  "/:id/profile-picture",
  verifyToken,
  authorize("ADMIN"),
  getUserProfilePicture,
);
router.get("/:id", verifyToken, authorize("ADMIN"), getUserById);
router.patch(
  "/:id/role",
  verifyToken,
  authorize("ADMIN"),
  validate(updateUserRoleSchema),
  updateUserRole,
);
router.delete("/:id", verifyToken, authorize("ADMIN"), deleteUser);

export default router;
