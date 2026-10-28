import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { generateReservationReferenceId } from "../utils/reservationReference.js";

describe("Reservation cancellation and status transitions", () => {
  let roomTypeId = "";
  let roomId = "";
  let guestId = "";
  let otherGuestId = "";
  let adminId = "";

  const createdReservationIds: string[] = [];

  function getToken(userId: string, role: "GUEST" | "ADMIN") {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured");
    }

    return jwt.sign({ userId, role }, secret, { expiresIn: "15m" });
  }

  function authCookie(userId: string, role: "GUEST" | "ADMIN") {
    return `accessToken=${getToken(userId, role)}`;
  }

  async function createTestReservation(
    userId = guestId,
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" = "PENDING",
  ) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10);
    checkIn.setHours(14, 0, 0, 0);

    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const reservation = await prisma.reservation.create({
      data: {
        referenceId: generateReservationReferenceId(),
        checkIn,
        checkOut,
        guests: 2,
        totalAmount: 200,
        status,
        userId,
        roomId,
      },
    });

    createdReservationIds.push(reservation.id);
    return reservation;
  }

  beforeAll(async () => {
    const roomType = await prisma.roomType.create({
      data: {
        name: `Status Test ${randomUUID()}`,
        description: "Temporary room type for status tests",
        capacity: 2,
        pricePerNight: 100,
      },
    });

    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `ST-${randomUUID().slice(0, 8)}`,
        roomTypeId,
      },
    });

    roomId = room.id;

    const guest = await prisma.user.create({
      data: {
        firstName: "Test",
        lastName: "Guest",
        email: `status-guest-${randomUUID()}@example.com`,
        password: "test-password-hash",
      },
    });

    guestId = guest.id;

    const otherGuest = await prisma.user.create({
      data: {
        firstName: "Other",
        lastName: "Guest",
        email: `status-other-${randomUUID()}@example.com`,
        password: "test-password-hash",
      },
    });

    otherGuestId = otherGuest.id;

    const admin = await prisma.user.create({
      data: {
        firstName: "Test",
        lastName: "Admin",
        email: `status-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });

    adminId = admin.id;
  });

  afterEach(async () => {
    if (createdReservationIds.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          reservationId: { in: [...createdReservationIds] },
        },
      });

      await prisma.reservation.deleteMany({
        where: {
          id: { in: [...createdReservationIds] },
        },
      });

      createdReservationIds.length = 0;
    }
  });

  afterAll(async () => {
    if (roomId) {
      await prisma.reservation.deleteMany({ where: { roomId } });
      await prisma.room.deleteMany({ where: { id: roomId } });
    }

    if (roomTypeId) {
      await prisma.roomType.deleteMany({ where: { id: roomTypeId } });
    }

    const userIds = [guestId, otherGuestId, adminId].filter(Boolean);

    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }

    await prisma.$disconnect();
  });

  it("allows a guest to cancel their own pending reservation", async () => {
    const reservation = await createTestReservation();

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("CANCELLED");

    const saved = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    });

    expect(saved?.status).toBe("CANCELLED");
  });

  it("prevents a guest from cancelling another guest's reservation", async () => {
    const reservation = await createTestReservation();

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(otherGuestId, "GUEST"));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  it("rejects cancelling a reservation that is already cancelled", async () => {
    const reservation = await createTestReservation(guestId, "CANCELLED");

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Reservation is already cancelled");
  });

  it("rejects cancelling a completed reservation", async () => {
    const reservation = await createTestReservation(guestId, "COMPLETED");

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Completed reservations cannot be cancelled",
    );
  });

  it("allows an admin to confirm a pending reservation", async () => {
    const reservation = await createTestReservation();

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/status`)
      .set("Cookie", authCookie(adminId, "ADMIN"))
      .send({ status: "CONFIRMED" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("CONFIRMED");

    const notifications = await prisma.notification.findMany({
      where: { userId: guestId, reservationId: reservation.id },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "RESERVATION_STATUS_UPDATED",
      title: "Reservation status updated",
      message: `Your reservation ${reservation.referenceId} is now confirmed.`,
    });

    const listResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(notifications[0].id);

    const otherGuestListResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", authCookie(otherGuestId, "GUEST"));

    expect(otherGuestListResponse.status).toBe(200);
    expect(otherGuestListResponse.body).toHaveLength(0);

    const markReadResponse = await request(app)
      .patch(`/api/notifications/${notifications[0].id}/read`)
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body.readAt).toBeTruthy();

    const otherGuestResponse = await request(app)
      .patch(`/api/notifications/${notifications[0].id}/read`)
      .set("Cookie", authCookie(otherGuestId, "GUEST"));

    expect(otherGuestResponse.status).toBe(404);
    expect(otherGuestResponse.body.message).toBe("Notification not found");
  });

  it("rejects an invalid status transition", async () => {
    const reservation = await createTestReservation(guestId, "CANCELLED");

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/status`)
      .set("Cookie", authCookie(adminId, "ADMIN"))
      .send({ status: "CONFIRMED" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Invalid status transition from CANCELLED to CONFIRMED",
    );
  });

  it("prevents a guest from updating admin reservation status", async () => {
    const reservation = await createTestReservation();

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/status`)
      .set("Cookie", authCookie(guestId, "GUEST"))
      .send({ status: "CONFIRMED" });

    expect(response.status).toBe(403);
  });

  it("returns 404 when an admin updates a nonexistent reservation", async () => {
    const response = await request(app)
      .patch(`/api/reservations/${randomUUID()}/status`)
      .set("Cookie", authCookie(adminId, "ADMIN"))
      .send({ status: "CONFIRMED" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reservation not found");
  });
});
