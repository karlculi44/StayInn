import { z } from "zod";

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  roomTypeId: z.uuid("Invalid room type ID"),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").optional(),
  roomTypeId: z.uuid("Invalid room type ID").optional(),
});

export const updateRoomStatusSchema = z
  .object({
    status: z.enum(["AVAILABLE", "MAINTENANCE", "INACTIVE"]),
    reason: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "AVAILABLE" && !data.reason) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is required for this room status",
      });
    }
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

export const adminAvailabilitySchema = availabilitySchema.safeExtend({
  excludeReservationId: z.uuid("Invalid reservation ID"),
});

export type AvailabilityQuery = z.infer<typeof availabilitySchema>;
export type AdminAvailabilityQuery = z.infer<typeof adminAvailabilitySchema>;
