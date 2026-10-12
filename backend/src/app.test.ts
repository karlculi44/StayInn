import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("returns liveness without an Origin header", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/health/ready", () => {
  it("returns ready when the database responds", async () => {
    vi.spyOn(prisma, "$queryRaw").mockResolvedValue([]);

    const response = await request(app).get("/api/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("returns a generic unavailable response when the database check fails", async () => {
    const databaseError = "sensitive database connection details";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error(databaseError));

    const response = await request(app).get("/api/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
    expect(JSON.stringify(response.body)).not.toContain(databaseError);
    expect(log).toHaveBeenCalledWith("Database readiness check failed");
  });
});
