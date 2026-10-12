import { describe, expect, it } from "vitest";
import { validateTestDatabaseUrl } from "./testDatabaseUrl.js";

describe("validateTestDatabaseUrl", () => {
  it.each([
    "postgresql://localhost:5432/stayinn_test",
    "postgres://127.0.0.1:5432/stayinn_test",
    "postgresql://[::1]:5432/stayinn_test",
  ])("accepts valid loopback URLs", (value) => {
    expect(validateTestDatabaseUrl(value)).toBe(value);
  });

  it.each([undefined, ""])("rejects a missing URL", (value) => {
    expect(() => validateTestDatabaseUrl(value)).toThrow(
      "TEST_DATABASE_URL is required.",
    );
  });

  it.each(["not-a-url", "ftp://localhost/stayinn_test"])(
    "rejects invalid PostgreSQL URLs",
    (value) => {
      expect(() => validateTestDatabaseUrl(value)).toThrow(
        "TEST_DATABASE_URL must be a valid PostgreSQL URL.",
      );
    },
  );

  it("rejects a URL for a different database", () => {
    expect(() =>
      validateTestDatabaseUrl("postgresql://localhost:5432/other_db"),
    ).toThrow("TEST_DATABASE_URL must target the stayinn_test database.");
  });

  it("rejects a non-loopback hostname", () => {
    expect(() =>
      validateTestDatabaseUrl("postgresql://db.example.invalid/stayinn_test"),
    ).toThrow(
      "TEST_DATABASE_URL must use a loopback host (localhost, 127.0.0.1, or ::1).",
    );
  });

  it("does not include connection details in validation errors", () => {
    const value = "postgresql://user:password@db.example.invalid/prod_db";

    let errorMessage = "";
    try {
      validateTestDatabaseUrl(value);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "";
    }

    expect(errorMessage).not.toContain("user");
    expect(errorMessage).not.toContain("password");
    expect(errorMessage).not.toContain("db.example.invalid");
    expect(errorMessage).not.toContain("prod_db");
  });
});
