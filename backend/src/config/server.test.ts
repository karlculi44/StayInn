import { beforeEach, describe, expect, it, vi } from "vitest";
import { startServer } from "../server.js";

const { listen } = vi.hoisted(() => ({
  listen: vi.fn(),
}));

vi.mock("../app.js", () => ({
  default: { listen },
}));

vi.mock("../utils/cleanupRefreshTokens.js", () => ({
  cleanupRefreshTokens: vi.fn(),
}));

describe("startServer configuration validation", () => {
  beforeEach(() => {
    listen.mockClear();
  });

  it("rejects invalid production configuration before starting the listener", async () => {
    await expect(
      startServer({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://localhost:5432/stayinn",
        JWT_ACCESS_TOKEN_SECRET: "test-access-secret",
        JWT_REFRESH_TOKEN_SECRET: "test-refresh-secret",
        FRONTEND_URL: undefined,
      }),
    ).rejects.toThrow("FRONTEND_URL");

    expect(listen).not.toHaveBeenCalled();
  });
});
