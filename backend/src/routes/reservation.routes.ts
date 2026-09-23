import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import { createReservationSchema } from "../schemas/reservation.schema.js";
import {
  createReservation,
  getReservationById,
  getReservations,
  cancelReservation,
} from "../controllers/reservation.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getReservations);
router.get("/:id", verifyToken, getReservationById);
router.patch("/:id/cancel", verifyToken, cancelReservation);

router.post(
  "/",
  verifyToken,
  validate(createReservationSchema),
  createReservation,
);

export default router;
