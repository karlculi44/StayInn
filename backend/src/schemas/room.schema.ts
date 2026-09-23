import { z } from "zod";

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  roomTypeId: z.uuid("Invalid room type ID"),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").optional(),
  roomTypeId: z.uuid("Invalid room type ID").optional(),
});
