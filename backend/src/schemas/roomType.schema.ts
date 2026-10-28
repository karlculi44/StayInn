import { z } from "zod";

export const createRoomTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  pricePerNight: z.coerce
    .number()
    .positive("Price per night must be greater than 0"),
});

export const updateRoomTypeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .optional(),
  pricePerNight: z.coerce
    .number()
    .positive("Price per night must be greater than 0")
    .optional(),
});
