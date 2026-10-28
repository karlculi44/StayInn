import multer from "multer";
import { AppError } from "../utils/AppError.js";

export const uploadRoomTypeImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 4,
    fieldSize: 10 * 1024,
    parts: 5,
  },
  fileFilter: (_req, file, callback) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/webp"
    ) {
      callback(null, true);
      return;
    }

    callback(new AppError("Only JPEG, PNG, and WebP images are supported", 415));
  },
}).single("image");
