import { Router } from "express";
import { getRooms } from "../controllers/room.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getRooms));

export default router;
