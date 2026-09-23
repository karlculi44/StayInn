import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { validate } from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

const router = Router();

router.get(
  "/me",
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json(user);
  }),
);
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
