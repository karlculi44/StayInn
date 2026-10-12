import { describe, expect, it } from "vitest";
import { updateUserRoleSchema } from "./user.schema.js";

describe("updateUserRoleSchema", () => {
  it("accepts ADMIN as a valid role", () => {
    const result = updateUserRoleSchema.safeParse({
      role: "ADMIN",
    });

    expect(result.success).toBe(true);
  });

  it("accepts GUEST as a valid role", () => {
    const result = updateUserRoleSchema.safeParse({
      role: "GUEST",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid role", () => {
    const result = updateUserRoleSchema.safeParse({
      role: "SUPERADMIN",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing role", () => {
    const result = updateUserRoleSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects a non-string role", () => {
    const result = updateUserRoleSchema.safeParse({
      role: 123,
    });

    expect(result.success).toBe(false);
  });
});
