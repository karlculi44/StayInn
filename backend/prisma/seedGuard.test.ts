import { describe, expect, it } from "vitest";
import { assertDevelopmentSeedEnvironment } from "./seedGuard.js";

describe("assertDevelopmentSeedEnvironment", () => {
  it("allows the development environment", () => {
    expect(() => assertDevelopmentSeedEnvironment("development")).not.toThrow();
  });

  it("rejects the production environment", () => {
    expect(() => assertDevelopmentSeedEnvironment("production")).toThrow(
      "Seed script can only run when NODE_ENV is explicitly set to development.",
    );
  });

  it("rejects an unset environment", () => {
    expect(() => assertDevelopmentSeedEnvironment(undefined)).toThrow(
      "Seed script can only run when NODE_ENV is explicitly set to development.",
    );
  });

  it("rejects the test environment", () => {
    expect(() => assertDevelopmentSeedEnvironment("test")).toThrow(
      "Seed script can only run when NODE_ENV is explicitly set to development.",
    );
  });
});
