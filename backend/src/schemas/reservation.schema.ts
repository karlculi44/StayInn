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

export const createAdminReservationSchema =
  reservationWithValidDatesSchema.safeExtend({
    userId: z.uuid("Invalid user ID"),
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
});
