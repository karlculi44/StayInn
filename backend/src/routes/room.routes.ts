import { Router } from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
} from "../controllers/room.controller.js";
import { createRoomSchema } from "../schemas/room.schema.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/", getRooms);
router.get("/:id", getRoomById);
router.post("/", validate(createRoomSchema), createRoom);

export default router;
