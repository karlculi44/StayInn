import { Router } from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../controllers/room.controller.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";
import { createRoomSchema, updateRoomSchema } from "../schemas/room.schema.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", getRooms);
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
