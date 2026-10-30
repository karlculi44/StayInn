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
  let secondAdminId = "";

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
    checkInDaysFromNow = 10,
  ) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + checkInDaysFromNow);
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

  async function createTestNotification(
    userId: string,
    reservationId: string,
    createdAt: Date,
    readAt: Date | null = null,
  ) {
    const notification = await prisma.notification.create({
      data: {
        type: "RESERVATION_STATUS_UPDATED",
        title: "Reservation status updated",
        message: "Your reservation status changed.",
        referenceType: "RESERVATION",
        referenceId: reservationId,
        createdAt,
      },
    });
    await prisma.notificationRecipient.create({
      data: {
        notificationId: notification.id,
        userId,
        isRead: readAt !== null,
        readAt,
      },
    });
    return notification;
  }

  async function createTestHistory(
    reservationId: string,
    actorId: string,
    visibility: "ADMIN_ONLY" | "GUEST_VISIBLE",
  ) {
    return prisma.reservationHistory.create({
      data: {
        reservationId,
        actorId,
        action: "UPDATED",
        description: "Internal operational detail.",
        oldValues: { internal: "before" },
        newValues: { internal: "after" },
        visibility,
      },
    });
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

    const secondAdmin = await prisma.user.create({
      data: {
        firstName: "Second",
        lastName: "Admin",
        email: `status-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });

    secondAdminId = secondAdmin.id;
  });

  afterEach(async () => {
    if (createdReservationIds.length > 0) {
      await prisma.reservationHistory.deleteMany({
        where: {
          reservationId: { in: [...createdReservationIds] },
        },
      });

      await prisma.notification.deleteMany({
        where: {
          referenceType: "RESERVATION",
          referenceId: { in: [...createdReservationIds] },
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

    const userIds = [guestId, otherGuestId, adminId, secondAdminId].filter(
      Boolean,
    );

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
      .set("Cookie", authCookie(guestId, "GUEST"))
      .send({ reason: "I can no longer make this trip." });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("CANCELLED");

    const saved = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    });

    expect(saved?.status).toBe("CANCELLED");
    const history = await prisma.reservationHistory.findFirst({
      where: { reservationId: reservation.id },
    });
    expect(history).toMatchObject({
      actorId: guestId,
      action: "CANCELLED",
      visibility: "GUEST_VISIBLE",
      oldValues: { status: "PENDING" },
      newValues: { status: "CANCELLED" },
    });
  });

  it("prevents a guest from cancelling another guest's reservation", async () => {
    const reservation = await createTestReservation();

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(otherGuestId, "GUEST"))
      .send({ reason: "I can no longer make this trip." });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  it("rejects cancelling a reservation that is already cancelled", async () => {
    const reservation = await createTestReservation(guestId, "CANCELLED");

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(guestId, "GUEST"))
      .send({ reason: "I can no longer make this trip." });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Reservation is already cancelled");
  });

  it("rejects cancelling a completed reservation", async () => {
    const reservation = await createTestReservation(guestId, "COMPLETED");

    const response = await request(app)
      .patch(`/api/reservations/${reservation.id}/cancel`)
      .set("Cookie", authCookie(guestId, "GUEST"))
      .send({ reason: "I can no longer make this trip." });

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
      where: {
        referenceType: "RESERVATION",
        referenceId: reservation.id,
        recipients: { some: { userId: guestId } },
      },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "RESERVATION_STATUS_UPDATED",
      title: "Reservation status updated",
      message: `Your reservation ${reservation.referenceId} is now confirmed.`,
      referenceType: "RESERVATION",
      referenceId: reservation.id,
    });

    const adminOnlyHistory = await createTestHistory(
      reservation.id,
      adminId,
      "ADMIN_ONLY",
    );
    const guestHistoryResponse = await request(app)
      .get(`/api/reservations/${reservation.id}/history`)
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(guestHistoryResponse.status).toBe(200);
    expect(guestHistoryResponse.body).toHaveLength(1);
    expect(guestHistoryResponse.body[0]).toMatchObject({
      action: "CONFIRMED",
      visibility: "GUEST_VISIBLE",
    });
    expect(guestHistoryResponse.body[0]).not.toHaveProperty("actor");
    expect(
      JSON.stringify(guestHistoryResponse.body),
    ).not.toContain("Internal operational detail");

    const adminHistoryResponse = await request(app)
      .get(`/api/reservations/${reservation.id}/history`)
      .set("Cookie", authCookie(secondAdminId, "ADMIN"));

    expect(adminHistoryResponse.status).toBe(200);
    expect(adminHistoryResponse.body).toHaveLength(2);
    expect(
      adminHistoryResponse.body.map(
        (entry: { id: string }) => entry.id,
      ),
    ).toContain(adminOnlyHistory.id);
    expect(
      adminHistoryResponse.body.find(
        (entry: { action: string }) => entry.action === "CONFIRMED",
      )?.actor,
    ).toMatchObject({
      id: adminId,
      role: "ADMIN",
    });

    const unauthorizedHistoryResponse = await request(app)
      .get(`/api/reservations/${reservation.id}/history`)
      .set("Cookie", authCookie(otherGuestId, "GUEST"));
    expect(unauthorizedHistoryResponse.status).toBe(403);

    const adminNotification = await createTestNotification(
      adminId,
      reservation.id,
      new Date(Date.now() + 1_000),
    );
    const otherGuestNotification = await createTestNotification(
      otherGuestId,
      reservation.id,
      new Date(Date.now() + 2_000),
    );

    const listResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(notifications[0].id);

    const paginatedResponse = await request(app)
      .get("/api/notifications?limit=1&offset=0")
      .set("Cookie", authCookie(guestId, "GUEST"));
    expect(paginatedResponse.status).toBe(200);
    expect(paginatedResponse.body.map((item: { id: string }) => item.id)).toEqual([
      notifications[0].id,
    ]);

    const unreadResponse = await request(app)
      .get("/api/notifications?unreadOnly=true")
      .set("Cookie", authCookie(guestId, "GUEST"));
    expect(unreadResponse.status).toBe(200);
    expect(unreadResponse.body.map((item: { id: string }) => item.id)).toEqual([
      notifications[0].id,
    ]);

    const adminListResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", authCookie(adminId, "ADMIN"));
    expect(adminListResponse.status).toBe(200);
    expect(
      adminListResponse.body.map((item: { id: string }) => item.id),
    ).toContain(adminNotification.id);
    expect(
      adminListResponse.body.map((item: { id: string }) => item.id),
    ).not.toContain(notifications[0].id);

    const unreadCountResponse = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(unreadCountResponse.status).toBe(200);
    expect(unreadCountResponse.body.count).toBe(1);

    const otherGuestListResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", authCookie(otherGuestId, "GUEST"));

    expect(otherGuestListResponse.status).toBe(200);
    expect(otherGuestListResponse.body.map((item: { id: string }) => item.id)).toEqual([
      otherGuestNotification.id,
    ]);

    const markReadResponse = await request(app)
      .patch(`/api/notifications/${notifications[0].id}/read`)
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body.readAt).toBeTruthy();

    const guestRecipient = await prisma.notificationRecipient.findUniqueOrThrow({
      where: {
        notificationId_userId: {
          notificationId: notifications[0].id,
          userId: guestId,
        },
      },
    });
    expect(guestRecipient.isRead).toBe(true);

    const updatedUnreadCountResponse = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(updatedUnreadCountResponse.status).toBe(200);
    expect(updatedUnreadCountResponse.body.count).toBe(0);

    const otherGuestResponse = await request(app)
      .patch(`/api/notifications/${notifications[0].id}/read`)
      .set("Cookie", authCookie(otherGuestId, "GUEST"));

    expect(otherGuestResponse.status).toBe(404);
    expect(otherGuestResponse.body.message).toBe("Notification not found");

    const duplicateConfirmation = await request(app)
      .patch(`/api/reservations/${reservation.id}/status`)
      .set("Cookie", authCookie(secondAdminId, "ADMIN"))
      .send({ status: "CONFIRMED" });
    expect(duplicateConfirmation.status).toBe(400);

    const completionResponse = await request(app)
      .patch(`/api/reservations/${reservation.id}/status`)
      .set("Cookie", authCookie(secondAdminId, "ADMIN"))
      .send({ status: "COMPLETED" });
    expect(completionResponse.status).toBe(200);

    const completionHistory = await prisma.reservationHistory.findFirst({
      where: {
        reservationId: reservation.id,
        action: "COMPLETED",
      },
    });
    expect(completionHistory).toMatchObject({
      actorId: secondAdminId,
      visibility: "GUEST_VISIBLE",
      oldValues: { status: "CONFIRMED" },
      newValues: { status: "COMPLETED" },
    });
    const guestCannotReadAdminsNotification = await request(app)
      .patch(`/api/notifications/${adminNotification.id}/read`)
      .set("Cookie", authCookie(guestId, "GUEST"));
    expect(guestCannotReadAdminsNotification.status).toBe(404);

    const adminCannotReadGuestsNotification = await request(app)
      .patch(`/api/notifications/${notifications[0].id}/read`)
      .set("Cookie", authCookie(adminId, "ADMIN"));
    expect(adminCannotReadGuestsNotification.status).toBe(404);

    const invalidLimitResponse = await request(app)
      .get("/api/notifications?limit=0")
      .set("Cookie", authCookie(guestId, "GUEST"));
    expect(invalidLimitResponse.status).toBe(400);

    const invalidFilterResponse = await request(app)
      .get("/api/notifications?unreadOnly=maybe")
      .set("Cookie", authCookie(guestId, "GUEST"));
    expect(invalidFilterResponse.status).toBe(400);

    const invalidIdResponse = await request(app)
      .patch("/api/notifications/not-a-uuid/read")
      .set("Cookie", authCookie(guestId, "GUEST"));
    expect(invalidIdResponse.status).toBe(400);
  });

  it("allows a guest to mark all their notifications as read", async () => {
    const firstReservation = await createTestReservation(guestId, "PENDING", 10);
    const secondReservation = await createTestReservation(guestId, "PENDING", 15);
    const otherGuestReservation = await createTestReservation(
      otherGuestId,
      "PENDING",
      20,
    );

    for (const reservation of [
      firstReservation,
      secondReservation,
      otherGuestReservation,
    ]) {
      const response = await request(app)
        .patch(`/api/reservations/${reservation.id}/status`)
        .set("Cookie", authCookie(adminId, "ADMIN"))
        .send({ status: "CONFIRMED" });

      expect(response.status).toBe(200);
    }

    const response = await request(app)
      .patch("/api/notifications/read-all")
      .set("Cookie", authCookie(guestId, "GUEST"));

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(response.body.readAt).toBeTruthy();

    const unreadNotifications = await prisma.notificationRecipient.findMany({
      where: { userId: guestId, isRead: false },
    });

    expect(unreadNotifications).toHaveLength(0);

    const otherGuestUnreadCount = await prisma.notificationRecipient.count({
      where: { userId: otherGuestId, isRead: false },
    });

    expect(otherGuestUnreadCount).toBe(1);
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
    expect(
      await prisma.reservationHistory.count({
        where: { reservationId: reservation.id },
      }),
    ).toBe(0);
  });

  it("serializes concurrent confirmation attempts and records only the winning action", async () => {
    const reservation = await createTestReservation(guestId, "PENDING", 30);
    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .patch(`/api/reservations/${reservation.id}/status`)
        .set("Cookie", authCookie(adminId, "ADMIN"))
        .send({ status: "CONFIRMED" }),
      request(app)
        .patch(`/api/reservations/${reservation.id}/status`)
        .set("Cookie", authCookie(secondAdminId, "ADMIN"))
        .send({ status: "CONFIRMED" }),
    ]);

    expect([firstResponse.status, secondResponse.status].sort()).toEqual([
      200,
      400,
    ]);
    expect(
      await prisma.reservationHistory.count({
        where: {
          reservationId: reservation.id,
          action: "CONFIRMED",
        },
      }),
    ).toBe(1);
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
