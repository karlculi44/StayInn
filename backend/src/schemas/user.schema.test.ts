import { describe, expect, it } from "vitest";
import { createUserSchema, updateUserRoleSchema } from "./user.schema.js";

describe("createUserSchema", () => {
  const validUser = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    password: "secure-password",
    role: "GUEST",
  };

  it("accepts valid user details and trims names", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      firstName: " Ada ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Ada");
    }
  });

  it("rejects invalid email, short password, missing names, and invalid roles", () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      firstName: " ",
      email: "not-an-email",
      password: "short",
      role: "SUPERADMIN",
    });

    expect(result.success).toBe(false);
  });
});

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
