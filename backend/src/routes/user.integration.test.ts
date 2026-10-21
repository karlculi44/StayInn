import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../app.js";
import { generateReservationReferenceId } from "../utils/reservationReference.js";
import {
  removeProfilePicture,
  storeProfilePicture,
} from "../services/profilePicture.js";
import hashToken from "../utils/hashToken.js";

const createdUserIds: string[] = [];
const createdReservationIds: string[] = [];
const createdRoomStatusHistoryIds: string[] = [];
const storedPictureKeys = new Set<string>();
const pngImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/J1sAAAAASUVORK5CYII=",
  "base64",
);

let testRoomTypeId = "";
let testRoomId = "";
let testAdminId = "";
let accessToken = "";

const createTestUser = async (role: "GUEST" | "ADMIN" = "GUEST") => {
  const user = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      email: `test-${randomUUID()}@example.com`,
      password: "test-password",
      role,
    },
  });

  createdUserIds.push(user.id);

  return user;
};

const createTestReservation = async (
  userId: string,
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED",
) => {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 10 + createdReservationIds.length * 3);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);

  const reservation = await prisma.reservation.create({
    data: {
      referenceId: generateReservationReferenceId(),
      checkIn,
      checkOut,
      guests: 1,
      totalAmount: "100.00",
      userId,
      roomId: testRoomId,
      status,
    },
  });

  createdReservationIds.push(reservation.id);
  return reservation;
};

describe("User management integration tests", () => {
  beforeAll(async () => {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }

    const admin = await prisma.user.create({
      data: {
        firstName: "Integration",
        lastName: "Admin",
        email: `integration-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    testAdminId = admin.id;

    accessToken = jwt.sign(
      {
        userId: admin.id,
        role: "ADMIN",
      },
      secret,
      { expiresIn: "5m" },
    );

    const roomType = await prisma.roomType.create({
      data: {
        name: `Vitest Room Type ${randomUUID()}`,
        description: "Temporary room type for integration tests",
        capacity: 2,
        pricePerNight: "100.00",
      },
    });

    testRoomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `TEST-${randomUUID()}`,
        roomTypeId: testRoomTypeId,
      },
    });

    testRoomId = room.id;
  });

  afterEach(async () => {
    for (const key of storedPictureKeys) {
      await removeProfilePicture(key);
    }
    storedPictureKeys.clear();

    if (createdReservationIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: { id: { in: createdReservationIds } },
      });
      createdReservationIds.length = 0;
    }

    if (createdRoomStatusHistoryIds.length > 0) {
      await prisma.roomStatusHistory.deleteMany({
        where: { id: { in: createdRoomStatusHistoryIds } },
      });
      createdRoomStatusHistoryIds.length = 0;
    }

    if (createdUserIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: {
          userId: { in: createdUserIds },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: { in: createdUserIds },
        },
      });

      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    if (testRoomId) {
      await prisma.room.delete({
        where: { id: testRoomId },
      });
    }

    if (testRoomTypeId) {
      await prisma.roomType.delete({
        where: { id: testRoomTypeId },
      });
    }

    if (testAdminId) {
      await prisma.user.delete({
        where: { id: testAdminId },
      });
    }

    await prisma.$disconnect();
  });

  it("allows an admin to update another user's role", async () => {
    const user = await createTestUser();

    const response = await request(app)
      .patch(`/api/users/${user.id}/role`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("ADMIN");

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.role).toBe("ADMIN");
  });

  it("rejects user deletion by unauthenticated and non-admin callers", async () => {
    const user = await createTestUser();
    const unauthenticatedResponse = await request(app).delete(
      `/api/users/${user.id}`,
    );
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }
    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      secret,
      { expiresIn: "5m" },
    );
    const guestResponse = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Cookie", `accessToken=${guestToken}`);

    expect(unauthenticatedResponse.status).toBe(401);
    expect(guestResponse.status).toBe(403);
  });

  it("returns each user's profile picture and serves it only to admins", async () => {
    const user = await createTestUser();
    const initialListResponse = await request(app)
      .get("/api/users")
      .set("Cookie", `accessToken=${accessToken}`);

    expect(initialListResponse.status).toBe(200);
    expect(
      initialListResponse.body.find(
        (listedUser: { id: string }) => listedUser.id === user.id,
      ).profilePictureUrl,
    ).toBeNull();

    const pictureKey = await storeProfilePicture(pngImage, "png");
    storedPictureKeys.add(pictureKey);
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: pictureKey },
    });

    const listResponse = await request(app)
      .get("/api/users")
      .set("Cookie", `accessToken=${accessToken}`);
    const listedUser = listResponse.body.find(
      (entry: { id: string }) => entry.id === user.id,
    );

    expect(listResponse.status).toBe(200);
    expect(listedUser.profilePictureUrl).toBe(
      `/api/users/${user.id}/profile-picture?v=${encodeURIComponent(pictureKey)}`,
    );
    expect(listedUser).not.toHaveProperty("profilePicture");

    const pictureResponse = await request(app)
      .get(`/api/users/${user.id}/profile-picture`)
      .set("Cookie", `accessToken=${accessToken}`);
    expect(pictureResponse.status).toBe(200);
    expect(pictureResponse.headers["content-type"]).toContain("image/png");
    expect(pictureResponse.body).toEqual(pngImage);

    const unauthenticatedResponse = await request(app).get(
      `/api/users/${user.id}/profile-picture`,
    );
    expect(unauthenticatedResponse.status).toBe(401);

    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }
    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      secret,
      { expiresIn: "5m" },
    );
    const guestResponse = await request(app)
      .get(`/api/users/${user.id}/profile-picture`)
      .set("Cookie", `accessToken=${guestToken}`);
    expect(guestResponse.status).toBe(403);
  });

  it("returns only guest accounts from the reservation guest-selection endpoint", async () => {
    const guest = await createTestUser();
    const admin = await createTestUser("ADMIN");

    const response = await request(app)
      .get("/api/users/guests")
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toContainEqual(
      expect.objectContaining({ id: guest.id, role: "GUEST" }),
    );
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ id: admin.id }),
    );
    expect(
      response.body.every(
        (user: { role: string }) => user.role === "GUEST",
      ),
    ).toBe(true);
  });

  it("allows an admin to create a user with a hashed password and safe response", async () => {
    const password = "secure-create-password";
    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        firstName: "Created",
        lastName: "User",
        email: `created-${randomUUID()}@example.com`,
        password,
        role: "GUEST",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      firstName: "Created",
      lastName: "User",
      role: "GUEST",
    });
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("passwordHash");
    createdUserIds.push(response.body.id);

    const createdUser = await prisma.user.findUnique({
      where: { id: response.body.id },
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser?.password).not.toBe(password);
    expect(await bcrypt.compare(password, createdUser!.password)).toBe(true);
  });

  it("rejects creating a user with an already registered email", async () => {
    const existingUser = await createTestUser();
    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        firstName: "Another",
        lastName: "User",
        email: existingUser.email,
        password: "secure-password",
        role: "GUEST",
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Email unavailable");
  });

  it("rejects invalid create-user input", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        firstName: "",
        lastName: "User",
        email: "invalid-email",
        password: "short",
        role: "SUPERADMIN",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  it("rejects user creation by non-admin users", async () => {
    const guest = await createTestUser();
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }
    const guestToken = jwt.sign(
      { userId: guest.id, role: "GUEST" },
      secret,
      { expiresIn: "5m" },
    );

    const response = await request(app)
      .post("/api/users")
      .set("Cookie", `accessToken=${guestToken}`)
      .send({
        firstName: "Blocked",
        lastName: "User",
        email: `blocked-${randomUUID()}@example.com`,
        password: "secure-password",
        role: "GUEST",
      });

    expect(response.status).toBe(403);
  });

  it("allows deletion of a user without reservations", async () => {
    const user = await createTestUser();
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }
    const userAccessToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      secret,
      { expiresIn: "5m" },
    );
    const refreshToken = jwt.sign(
      { userId: user.id, jti: randomUUID() },
      process.env.JWT_REFRESH_TOKEN_SECRET as string,
      { expiresIn: "7d" },
    );
    const refreshTokenHash = hashToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(204);

    const deletedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(deletedUser).toBeNull();
    expect(
      await prisma.refreshToken.findUnique({
        where: { tokenHash: refreshTokenHash },
      }),
    ).toBeNull();
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .set("Cookie", `accessToken=${userAccessToken}`)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/auth/refresh")
          .set("Cookie", `refreshToken=${refreshToken}`)
      ).status,
    ).toBe(401);
  });

  it("preserves room status audit history while clearing the deleted admin reference", async () => {
    const user = await createTestUser();
    const history = await prisma.roomStatusHistory.create({
      data: {
        previousStatus: "AVAILABLE",
        newStatus: "MAINTENANCE",
        reason: "User deletion audit test",
        roomId: testRoomId,
        adminId: user.id,
      },
    });
    createdRoomStatusHistoryIds.push(history.id);

    const response = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(204);
    expect(
      await prisma.roomStatusHistory.findUnique({
        where: { id: history.id },
      }),
    ).toMatchObject({
      id: history.id,
      reason: "User deletion audit test",
      adminId: null,
    });
  });

  it.each(["COMPLETED", "CANCELLED"] as const)(
    "deletes a user with only %s reservations and preserves history",
    async (status) => {
      const user = await createTestUser();
      const reservation = await createTestReservation(user.id, status);

      const response = await request(app)
        .delete(`/api/users/${user.id}`)
        .set("Cookie", `accessToken=${accessToken}`);

      expect(response.status).toBe(204);
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).toBeNull();

      const savedReservation = await prisma.reservation.findUnique({
        where: { id: reservation.id },
      });
      expect(savedReservation).toMatchObject({
        id: reservation.id,
        status,
        userId: null,
      });

      const adminReservationsResponse = await request(app)
        .get("/api/reservations/admin")
        .set("Cookie", `accessToken=${accessToken}`);
      expect(adminReservationsResponse.status).toBe(200);
      expect(
        adminReservationsResponse.body.find(
          (entry: { id: string }) => entry.id === reservation.id,
        ).user,
      ).toBeNull();
    },
  );

  it.each(["PENDING", "CONFIRMED"] as const)(
    "rejects deletion when the user has a %s reservation",
    async (status) => {
      const user = await createTestUser();
      const reservation = await createTestReservation(user.id, status);

      const response = await request(app)
        .delete(`/api/users/${user.id}`)
        .set("Cookie", `accessToken=${accessToken}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "Resolve pending or confirmed reservations before deleting this user",
      );
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).not.toBeNull();
      expect(
        await prisma.reservation.findUnique({
          where: { id: reservation.id },
        }),
      ).not.toBeNull();
    },
  );

  it("rejects deletion when historical and active reservations are mixed", async () => {
    const user = await createTestUser();
    const completedReservation = await createTestReservation(
      user.id,
      "COMPLETED",
    );
    const pendingReservation = await createTestReservation(user.id, "PENDING");

    const response = await request(app)
      .delete(`/api/users/${user.id}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Resolve pending or confirmed reservations before deleting this user",
    );
    expect(
      await prisma.user.findUnique({ where: { id: user.id } }),
    ).not.toBeNull();
    expect(
      await prisma.reservation.findMany({
        where: { id: { in: [completedReservation.id, pendingReservation.id] } },
      }),
    ).toHaveLength(2);
  });

  it("returns 404 when deleting a nonexistent user", async () => {
    const nonexistentUserId = randomUUID();

    const response = await request(app)
      .delete(`/api/users/${nonexistentUserId}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });
});
