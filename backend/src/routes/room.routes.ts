import { Router } from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
  getAvailableRoomsForAdmin,
  updateRoomStatus,
  getAllRoomsForAdmin,
} from "../controllers/room.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";
import {
  createRoomSchema,
  updateRoomSchema,
  availabilitySchema,
  adminAvailabilitySchema,
  updateRoomStatusSchema,
} from "../schemas/room.schema.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", getRooms);

router.get("/admin", verifyToken, authorize("ADMIN"), getAllRoomsForAdmin);

router.get(
  "/availability/admin",
  verifyToken,
  authorize("ADMIN"),
  validate(adminAvailabilitySchema, "query"),
  getAvailableRoomsForAdmin,
);

router.get(
  "/availability",
  validate(availabilitySchema, "query"),
  getAvailableRooms,
);

router.get("/:id", getRoomById);

router.post(
  "/",
  verifyToken,
  authorize("ADMIN"),
  validate(createRoomSchema),
  createRoom,
);

router.patch(
  "/:id",
  verifyToken,
  authorize("ADMIN"),
  validate(updateRoomSchema),
  updateRoom,
);

router.patch(
  "/:id/status",
  verifyToken,
  authorize("ADMIN"),
  validate(updateRoomStatusSchema),
  updateRoomStatus,
);

router.delete("/:id", verifyToken, authorize("ADMIN"), deleteRoom);

export default router;
