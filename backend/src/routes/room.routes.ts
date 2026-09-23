import { Router } from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../controllers/room.controller.js";
import { createRoomSchema, updateRoomSchema } from "../schemas/room.schema.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", getRooms);
router.get("/:id", getRoomById);
router.post("/", validate(createRoomSchema), createRoom);
router.patch("/:id", validate(updateRoomSchema), updateRoom);
router.delete("/:id", deleteRoom);
export default router;
