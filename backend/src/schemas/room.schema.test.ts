import { describe, expect, it } from "vitest";
import { updateRoomStatusSchema } from "./room.schema.js";

describe("updateRoomStatusSchema", () => {
  it("accepts AVAILABLE without a reason", () => {
    const result = updateRoomStatusSchema.safeParse({
      status: "AVAILABLE",
    });

    expect(result.success).toBe(true);
  });

  it("accepts MAINTENANCE with a reason", () => {
    const result = updateRoomStatusSchema.safeParse({
      status: "MAINTENANCE",
      reason: "Bathroom repairs",
    });

    expect(result.success).toBe(true);
  });

  it("rejects MAINTENANCE without a reason", () => {
    const result = updateRoomStatusSchema.safeParse({
      status: "MAINTENANCE",
    });

    expect(result.success).toBe(false);
  });

  it("rejects INACTIVE with a whitespace-only reason", () => {
    const result = updateRoomStatusSchema.safeParse({
      status: "INACTIVE",
      reason: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = updateRoomStatusSchema.safeParse({
      status: "OCCUPIED",
    });

    expect(result.success).toBe(false);
  });
});
