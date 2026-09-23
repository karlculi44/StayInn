import express from "express";
import { validate } from "../middleware/validate.middleware.js";
import { verifyToken, authorize } from "../middleware/auth.middleware.js";
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
router.post(
  "/",
  verifyToken,
  authorize("ADMIN"),
  validate(createRoomTypeSchema),
  createRoomType,
);
router.patch(
  "/:id",
  verifyToken,
  authorize("ADMIN"),
  validate(updateRoomTypeSchema),
  updateRoomType,
);
router.delete("/:id", verifyToken, authorize("ADMIN"), deleteRoomType);

export default router;
