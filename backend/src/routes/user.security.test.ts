import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";

const testUserId = "test-admin-id";
let accessToken: string;

beforeAll(() => {
  const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
  }

  accessToken = jwt.sign(
    {
      userId: testUserId,
      role: "ADMIN",
    },
    secret,
    { expiresIn: "5m" },
  );
});

describe("Admin self-protection", () => {
  it("prevents an admin from changing their own role", async () => {
    const response = await request(app)
      .patch(`/api/users/${testUserId}/role`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({ role: "GUEST" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("You cannot change your own role");
  });

  it("prevents an admin from deleting their own account", async () => {
    const response = await request(app)
      .delete(`/api/users/${testUserId}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("You cannot delete your own account");
  });
});
