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
  getRoomTypeImage,
  updateRoomType,
  deleteRoomType,
} from "../controllers/roomType.controller.js";
import { uploadRoomTypeImage } from "../middleware/roomTypeImageUpload.middleware.js";

const router = express.Router();

router.get("/", getRoomTypes);
router.get("/images/:key", getRoomTypeImage);
router.get("/:id", getRoomTypeById);
router.post(
  "/",
  verifyToken,
  authorize("ADMIN"),
  uploadRoomTypeImage,
  validate(createRoomTypeSchema),
  createRoomType,
);
router.patch(
  "/:id",
  verifyToken,
  authorize("ADMIN"),
  uploadRoomTypeImage,
  validate(updateRoomTypeSchema),
  updateRoomType,
);
router.delete("/:id", verifyToken, authorize("ADMIN"), deleteRoomType);

export default router;
