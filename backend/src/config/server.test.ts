import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { appLoaded, cleanupLoaded, listen } = vi.hoisted(() => ({
  appLoaded: vi.fn(),
  cleanupLoaded: vi.fn(),
  listen: vi.fn(),
}));

vi.mock("../app.js", () => {
  appLoaded();
  return { default: { listen } };
});

vi.mock("../utils/cleanupRefreshTokens.js", () => {
  cleanupLoaded();
  return { cleanupRefreshTokens: vi.fn() };
});

const testEnvironmentKeys = [
  "NODE_ENV",
  "JWT_ACCESS_TOKEN_SECRET",
  "JWT_REFRESH_TOKEN_SECRET",
  "FRONTEND_URL",
  "PORT",
] as const;

const originalEnvironment = new Map<
  (typeof testEnvironmentKeys)[number],
  string | undefined
>();

describe("server configuration bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();

    for (const key of testEnvironmentKeys) {
      originalEnvironment.set(key, process.env[key]);
    }

    process.env.NODE_ENV = "test";
    process.env.JWT_ACCESS_TOKEN_SECRET = "stayinn-test-access-secret";
    process.env.JWT_REFRESH_TOKEN_SECRET = "stayinn-test-refresh-secret";
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.PORT = "5000";

    appLoaded.mockClear();
    cleanupLoaded.mockClear();
    listen.mockClear();
  });

  afterEach(() => {
    for (const key of testEnvironmentKeys) {
      const originalValue = originalEnvironment.get(key);
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  });

  it("loads the server with explicit test configuration", async () => {
    const server = await import("../server.js");

    expect(server.startServer).toBeTypeOf("function");
    expect(appLoaded).toHaveBeenCalledOnce();
    expect(cleanupLoaded).toHaveBeenCalledOnce();
    expect(listen).not.toHaveBeenCalled();
  });

  it("rejects invalid configuration before loading the app or Prisma cleanup", async () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "";

    await expect(import("../server.js")).rejects.toThrow("FRONTEND_URL");

    expect(appLoaded).not.toHaveBeenCalled();
    expect(cleanupLoaded).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });
});
