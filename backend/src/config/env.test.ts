import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const validEnvironment: Record<string, string | undefined> = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://localhost:5432/stayinn",
  JWT_ACCESS_TOKEN_SECRET: "test-access-secret",
  JWT_REFRESH_TOKEN_SECRET: "test-refresh-secret",
  FRONTEND_URL: "https://stayinn.example",
  PORT: "5001",
};

describe("parseEnv", () => {
  it("parses valid development configuration", () => {
    const environment = parseEnv({
      ...validEnvironment,
      NODE_ENV: "development",
      FRONTEND_URL: undefined,
      PORT: undefined,
    });

    expect(environment.NODE_ENV).toBe("development");
    expect(environment.FRONTEND_URL).toBe("http://localhost:5173");
    expect(environment.PORT).toBe(5000);
  });

  it("parses valid test configuration with the development frontend default", () => {
    const environment = parseEnv({
      ...validEnvironment,
      NODE_ENV: "test",
      FRONTEND_URL: undefined,
    });

    expect(environment.NODE_ENV).toBe("test");
    expect(environment.FRONTEND_URL).toBe("http://localhost:5173");
  });

  it("requires NODE_ENV to be explicit", () => {
    expect(() =>
      parseEnv({ ...validEnvironment, NODE_ENV: undefined }),
    ).toThrow("NODE_ENV");
  });

  it("rejects a missing database URL without exposing its value", () => {
    expect(() =>
      parseEnv({ ...validEnvironment, DATABASE_URL: undefined }),
    ).toThrow("DATABASE_URL");
  });

  it("rejects a missing access-token secret", () => {
    expect(() =>
      parseEnv({ ...validEnvironment, JWT_ACCESS_TOKEN_SECRET: undefined }),
    ).toThrow("JWT_ACCESS_TOKEN_SECRET");
  });

  it("rejects a missing refresh-token secret", () => {
    expect(() =>
      parseEnv({ ...validEnvironment, JWT_REFRESH_TOKEN_SECRET: undefined }),
    ).toThrow("JWT_REFRESH_TOKEN_SECRET");
  });

  it("requires a frontend URL in production", () => {
    expect(() =>
      parseEnv({
        ...validEnvironment,
        NODE_ENV: "production",
        FRONTEND_URL: undefined,
        JWT_ACCESS_TOKEN_SECRET: "a".repeat(32),
        JWT_REFRESH_TOKEN_SECRET: "b".repeat(32),
      }),
    ).toThrow("FRONTEND_URL");
  });

  it("rejects missing JWT secrets in production", () => {
    for (const variable of [
      "JWT_ACCESS_TOKEN_SECRET",
      "JWT_REFRESH_TOKEN_SECRET",
    ] as const) {
      expect(() =>
        parseEnv({
          ...validEnvironment,
          NODE_ENV: "production",
          JWT_ACCESS_TOKEN_SECRET: "a".repeat(32),
          JWT_REFRESH_TOKEN_SECRET: "b".repeat(32),
          [variable]: undefined,
        }),
      ).toThrow(variable);
    }
  });

  it.each([
    "replace-with-a-random-local-only-access-secret",
    "replace-with-a-different-local-only-refresh-secret",
    "stayinn-test-access-secret",
    "stayinn-test-refresh-secret",
    "placeholder-secret-value-that-is-long-enough",
  ])("rejects a production JWT placeholder", (secret) => {
    expect(() =>
      parseEnv({
        ...validEnvironment,
        NODE_ENV: "production",
        JWT_ACCESS_TOKEN_SECRET: secret,
        JWT_REFRESH_TOKEN_SECRET: "b".repeat(32),
      }),
    ).toThrow("JWT_ACCESS_TOKEN_SECRET");
  });

  it.each([
    ["JWT_ACCESS_TOKEN_SECRET", "JWT_REFRESH_TOKEN_SECRET"],
    ["JWT_REFRESH_TOKEN_SECRET", "JWT_ACCESS_TOKEN_SECRET"],
  ] as const)("rejects a short production %s", (variable, otherVariable) => {
    const errorMessage = (() => {
      try {
        parseEnv({
          ...validEnvironment,
          NODE_ENV: "production",
          JWT_ACCESS_TOKEN_SECRET: "a".repeat(32),
          JWT_REFRESH_TOKEN_SECRET: "b".repeat(32),
          [variable]: "x".repeat(31),
        });
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }

      return "";
    })();

    expect(errorMessage).toContain(variable);
    expect(errorMessage).not.toContain("x".repeat(31));
    expect(errorMessage).not.toContain(otherVariable);
  });

  it("rejects identical production JWT secrets", () => {
    const secret = "a".repeat(32);

    expect(() =>
      parseEnv({
        ...validEnvironment,
        NODE_ENV: "production",
        JWT_ACCESS_TOKEN_SECRET: secret,
        JWT_REFRESH_TOKEN_SECRET: secret,
      }),
    ).toThrow("JWT_ACCESS_TOKEN_SECRET");
  });

  it("accepts sufficiently long distinct production JWT secrets", () => {
    const environment = parseEnv({
      ...validEnvironment,
      NODE_ENV: "production",
      JWT_ACCESS_TOKEN_SECRET: "a".repeat(32),
      JWT_REFRESH_TOKEN_SECRET: "b".repeat(32),
    });

    expect(environment.NODE_ENV).toBe("production");
  });

  it("rejects an unsupported NODE_ENV", () => {
    expect(() =>
      parseEnv({ ...validEnvironment, NODE_ENV: "staging" }),
    ).toThrow("NODE_ENV");
  });

  it.each(["", "0", "65536", "1.5", "abc"])(
    "rejects invalid port %j",
    (port) => {
      expect(() => parseEnv({ ...validEnvironment, PORT: port })).toThrow(
        "PORT",
      );
    },
  );

  it("rejects malformed database URLs without exposing them", () => {
    expect(() =>
      parseEnv({ ...validEnvironment, DATABASE_URL: "not-a-url" }),
    ).toThrow("DATABASE_URL");
  });

  it.each([
    "not-a-url",
    "ftp://stayinn.example",
    "https://stayinn.example/path",
  ])("rejects invalid frontend origins %j", (frontendUrl) => {
    expect(() =>
      parseEnv({ ...validEnvironment, FRONTEND_URL: frontendUrl }),
    ).toThrow("FRONTEND_URL");
  });
});
