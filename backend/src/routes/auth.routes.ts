import express, { Router } from "express";
import { authRateLimiter } from "../middleware/rateLimit.middleware.js";
import { env } from "../config/runtime.js";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refresh,
  getMyProfilePicture,
  uploadMyProfilePicture,
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

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", authRateLimiter, refresh);
router.get("/me", verifyToken, getMe);
router.get("/me/profile-picture", verifyToken, getMyProfilePicture);
router.put(
  "/me/profile-picture",
  verifyToken,
  express.raw({
    type: () => true,
    limit: env.PROFILE_IMAGE_MAX_SIZE_MB * 1024 * 1024,
  }),
  uploadMyProfilePicture,
);
router.patch("/me", verifyToken, validate(updateProfileSchema), updateProfile);
router.patch(
  "/me/password",
  verifyToken,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
