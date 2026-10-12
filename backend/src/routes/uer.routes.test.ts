import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("User routes authentication", () => {
  it("rejects unauthenticated requests to list users", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated role updates", async () => {
    const response = await request(app)
      .patch("/api/users/test-user-id/role")
      .send({ role: "ADMIN" });

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated user deletion", async () => {
    const response = await request(app).delete("/api/users/test-user-id");

    expect(response.status).toBe(401);
  });
});
