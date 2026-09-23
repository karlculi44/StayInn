import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import { createReservationSchema } from "../schemas/reservation.schema.js";
import { createReservation } from "../controllers/reservation.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  validate(createReservationSchema),
  createReservation,
);

export default router;
