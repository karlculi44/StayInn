import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import {
  createRoomTypeSchema,
  updateRoomTypeSchema,
} from "../schemas/roomType.schema.js";
import {
  getRoomTypes,
  createRoomType,
  getRoomTypeById,
  updateRoomType,
  deleteRoomType,
} from "../controllers/roomType.controller.js";

const router = express.Router();

router.get("/", getRoomTypes);
router.get("/:id", getRoomTypeById);
router.post("/", validate(createRoomTypeSchema), createRoomType);
router.patch("/:id", validate(updateRoomTypeSchema), updateRoomType);
router.delete("/:id", deleteRoomType);

export default router;
