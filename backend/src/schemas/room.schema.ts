import { z } from "zod";

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  roomTypeId: z.uuid("Invalid room type ID"),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").optional(),
  roomTypeId: z.uuid("Invalid room type ID").optional(),
  status: z.enum(["AVAILABLE", "INACTIVE", "MAINTENANCE"]).optional(),
});

export const availabilitySchema = z
  .object({
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type AvailabilityQuery = z.infer<typeof availabilitySchema>;
