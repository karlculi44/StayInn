import { Router } from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAvailableRooms,
} from "../controllers/room.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";
import {
  createRoomSchema,
  updateRoomSchema,
  availabilitySchema,
} from "../schemas/room.schema.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", getRooms);

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

router.delete("/:id", verifyToken, authorize("ADMIN"), deleteRoom);

export default router;
