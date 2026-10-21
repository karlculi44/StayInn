import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import {
  createReservationSchema,
  createAdminReservationSchema,
  updateAdminReservationSchema,
  adminReservationQuerySchema,
  updateReservationStatusSchema,
} from "../schemas/reservation.schema.js";
import {
  createReservation,
  createAdminReservation,
  getReservationById,
  getReservations,
  cancelReservation,
  getAllReservations,
  updateReservationStatus,
  updateAdminReservation,
} from "../controllers/reservation.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getReservations);
router.post(
  "/admin",
  verifyToken,
  authorize("ADMIN"),
  validate(createAdminReservationSchema),
  createAdminReservation,
);
router.get(
  "/admin",
  verifyToken,
  authorize("ADMIN"),
  validate(adminReservationQuerySchema, "query"),
  getAllReservations,
);
router.patch(
  "/admin/:id",
  verifyToken,
  authorize("ADMIN"),
  validate(updateAdminReservationSchema),
  updateAdminReservation,
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
  authorize("GUEST"),
  validate(createReservationSchema),
  createReservation,
);

export default router;
