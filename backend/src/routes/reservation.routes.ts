import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import {
  createReservationSchema,
  adminReservationQuerySchema,
  updateReservationStatusSchema,
} from "../schemas/reservation.schema.js";
import {
  createReservation,
  getReservationById,
  getReservations,
  cancelReservation,
  getAllReservations,
  updateReservationStatus,
} from "../controllers/reservation.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getReservations);
router.get(
  "/admin",
  verifyToken,
  authorize("ADMIN"),
  validate(adminReservationQuerySchema, "query"),
  getAllReservations,
);
router.get("/:id", verifyToken, getReservationById);
router.patch("/:id/cancel", verifyToken, cancelReservation);
router.patch(
  "/:id/status",
  verifyToken,
  authorize("ADMIN"),
  validate(updateReservationStatusSchema),
  updateReservationStatus,
);

router.post(
  "/",
  verifyToken,
  validate(createReservationSchema),
  createReservation,
);

export default router;
