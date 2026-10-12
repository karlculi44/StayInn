import { describe, expect, it } from "vitest";
import {
  createReservationSchema,
  adminReservationQuerySchema,
} from "./reservation.schema.js";

describe("createReservationSchema", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const validReservation = {
    checkIn: tomorrow.toISOString(),
    checkOut: dayAfterTomorrow.toISOString(),
    guests: 2,
    roomId: "d4a29247-2f66-45a4-a58a-9fad19ffdb8e",
  };

  it("accepts a valid reservation", () => {
    const result = createReservationSchema.safeParse(validReservation);

    expect(result.success).toBe(true);
  });

  it("rejects check-in in the past", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = createReservationSchema.safeParse({
      ...validReservation,
      checkIn: yesterday.toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejects checkout before check-in", () => {
    const result = createReservationSchema.safeParse({
      ...validReservation,
      checkOut: validReservation.checkIn,
    });

    expect(result.success).toBe(false);
  });

  it("rejects zero guests", () => {
    const result = createReservationSchema.safeParse({
      ...validReservation,
      guests: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-integer guest count", () => {
    const result = createReservationSchema.safeParse({
      ...validReservation,
      guests: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid room ID", () => {
    const result = createReservationSchema.safeParse({
      ...validReservation,
      roomId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });
});

describe("adminReservationQuerySchema", () => {
  it("accepts a valid reservation status", () => {
    const result = adminReservationQuerySchema.safeParse({
      status: "CONFIRMED",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid reservation status", () => {
    const result = adminReservationQuerySchema.safeParse({
      status: "BOOKED",
    });

    expect(result.success).toBe(false);
  });

  it("rejects checkout before check-in", () => {
    const result = adminReservationQuerySchema.safeParse({
      checkIn: "2027-01-10",
      checkOut: "2027-01-09",
    });

    expect(result.success).toBe(false);
  });
});
