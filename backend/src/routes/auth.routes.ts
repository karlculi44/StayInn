import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refresh,
} from "../controllers/auth.controller.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../schemas/auth.schema.js";
import { validate } from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, validate(updateProfileSchema), updateProfile);
router.patch(
  "/me/password",
  verifyToken,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
