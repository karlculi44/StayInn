import { z } from "zod";

const reservationDetailsSchema = z.object({
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.number().int().positive("Guests must be greater than 0"),
  roomId: z.uuid("Invalid room ID"),
});

const reservationWithValidDatesSchema = reservationDetailsSchema
  .refine(
    (data) => {
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      return data.checkIn >= today;
    },
    {
      message: "Check-in cannot be in the past",
      path: ["checkIn"],
    },
  )
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export const createReservationSchema = reservationWithValidDatesSchema;

export const updateGuestReservationSchema = reservationWithValidDatesSchema;

export const createAdminReservationSchema =
  reservationWithValidDatesSchema.safeExtend({
    userId: z.uuid("Invalid user ID"),
  });

export const updateAdminReservationSchema =
  createAdminReservationSchema.safeExtend({
    reason: z.string().trim().min(1, "An explanation is required").max(1000),
  });

export const guestReservationRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EDIT"),
    reason: z.string().trim().min(1, "A reason is required").max(1000),
    proposedChanges: reservationWithValidDatesSchema,
  }),
  z.object({
    type: z.literal("CANCELLATION"),
    reason: z.string().trim().min(1, "A reason is required").max(1000),
  }),
]);

export const reviewReservationRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewReason: z.string().trim().min(1, "A review reason is required").max(1000),
});

export const cancelReservationSchema = z.object({
  reason: z.string().trim().min(1, "A cancellation reason is required").max(1000),
});

export const adminReservationQuerySchema = z
  .object({
    status: z
      .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"])
      .optional(),

    checkIn: z.coerce.date().optional(),
    checkOut: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.checkIn || !data.checkOut || data.checkOut > data.checkIn,
    {
      message: "Check-out must be after check-in",
      path: ["checkOut"],
    },
  );

export type AdminReservationQuery = z.infer<typeof adminReservationQuerySchema>;

export const updateReservationStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  reason: z
    .string()
    .trim()
    .min(1, "A cancellation reason is required")
    .max(1000)
    .optional(),
}).refine((data) => data.status !== "CANCELLED" || Boolean(data.reason), {
  message: "A cancellation reason is required",
  path: ["reason"],
});
