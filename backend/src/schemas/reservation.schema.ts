import { z } from "zod";

export const createReservationSchema = z
  .object({
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
    guests: z.number().int().positive("Guests must be greater than 0"),
    roomId: z.uuid("Invalid room ID"),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out date must be after check-in date",
    path: ["checkOut"],
  });
