import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { generateReservationReferenceId } from "../utils/reservationReference.js";

let testRoomTypeId = "";
let testRoomId = "";
let adminId = "";
let accessToken = "";
const createdUserIds: string[] = [];
const createdAdminIds: string[] = [];

const futureDate = (daysFromNow: number) => {
  const date = new Date();
  date.setHours(14, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const createTestUser = async () => {
  const user = await prisma.user.create({
    data: {
      firstName: "Reservation",
      lastName: "Tester",
      email: `reservation-${randomUUID()}@example.com`,
      password: "test-password",
      role: "GUEST",
    },
  });

  createdUserIds.push(user.id);
  return user;
};

const createExistingReservation = async (
  userId: string,
  checkIn: Date,
  checkOut: Date,
  status: "PENDING" | "CONFIRMED" | "CANCELLED" = "CONFIRMED",
) => {
  return prisma.reservation.create({
    data: {
      referenceId: generateReservationReferenceId(),
      userId,
      roomId: testRoomId,
      checkIn,
      checkOut,
      guests: 2,
      totalAmount: "200.00",
      status,
    },
  });
};

const bookRoom = async (
  userId: string,
  checkIn: Date,
  checkOut: Date,
  guests = 2,
  roomId = testRoomId,
) => {
  const token = jwt.sign(
    {
      userId,
      role: "GUEST",
    },
    process.env.JWT_ACCESS_TOKEN_SECRET as string,
    { expiresIn: "5m" },
  );

  return request(app)
    .post("/api/reservations")
    .set("Cookie", `accessToken=${token}`)
    .send({
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests,
      roomId,
    });
};

const createAdminReservation = async (
  userId: string,
  checkIn: Date,
  checkOut: Date,
  guests = 2,
  roomId = testRoomId,
) =>
  request(app)
    .post("/api/reservations/admin")
    .set("Cookie", `accessToken=${accessToken}`)
    .send({
      userId,
      roomId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests,
      totalAmount: 0.01,
    });

const editAdminReservation = async (
  reservationId: string,
  userId: string,
  checkIn: Date,
  checkOut: Date,
  guests = 2,
  roomId = testRoomId,
) =>
  request(app)
    .patch(`/api/reservations/admin/${reservationId}`)
    .set("Cookie", `accessToken=${accessToken}`)
    .send({
      userId,
      roomId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests,
      reason: "Guest requested a reservation adjustment.",
    });

const editGuestReservation = async (
  reservationId: string,
  userId: string,
  checkIn: Date,
  checkOut: Date,
  guests = 2,
  roomId = testRoomId,
) => {
  const token = jwt.sign(
    { userId, role: "GUEST" },
    process.env.JWT_ACCESS_TOKEN_SECRET as string,
    { expiresIn: "5m" },
  );

  return request(app)
    .patch(`/api/reservations/${reservationId}`)
    .set("Cookie", `accessToken=${token}`)
    .send({
      roomId,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      guests,
    });
};

const submitGuestRequest = (
  reservationId: string,
  userId: string,
  body: Record<string, unknown>,
) => {
  const token = jwt.sign(
    { userId, role: "GUEST" },
    process.env.JWT_ACCESS_TOKEN_SECRET as string,
    { expiresIn: "5m" },
  );

  return request(app)
    .post(`/api/reservations/${reservationId}/requests`)
    .set("Cookie", `accessToken=${token}`)
    .send(body);
};

describe("Reservation booking integration tests", () => {
  beforeAll(async () => {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error("JWT_ACCESS_TOKEN_SECRET is not configured.");
    }

    const admin = await prisma.user.create({
      data: {
        firstName: "Reservation",
        lastName: "Admin",
        email: `reservation-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    adminId = admin.id;
    createdAdminIds.push(admin.id);

    const secondAdmin = await prisma.user.create({
      data: {
        firstName: "Reservation",
        lastName: "Admin Two",
        email: `reservation-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    createdAdminIds.push(secondAdmin.id);

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
        name: `Reservation Test ${randomUUID()}`,
        description: "Temporary room type for booking tests",
        capacity: 2,
        pricePerNight: "100.00",
      },
    });

    testRoomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `RT-${randomUUID()}`,
        roomTypeId: testRoomTypeId,
      },
    });

    testRoomId = room.id;
  });

  afterEach(async () => {
    if (testRoomId) {
      const reservations = await prisma.reservation.findMany({
        where: { roomId: testRoomId },
        select: { id: true },
      });
      const reservationIds = reservations.map(({ id }) => id);

      if (reservationIds.length > 0) {
        await prisma.reservationRequest.deleteMany({
          where: { reservationId: { in: reservationIds } },
        });
        await prisma.reservationHistory.deleteMany({
          where: { reservationId: { in: reservationIds } },
        });
        await prisma.notification.deleteMany({
          where: {
            referenceType: "RESERVATION",
            referenceId: { in: reservationIds },
          },
        });
        await prisma.reservation.deleteMany({
          where: { id: { in: reservationIds } },
        });
      }
    }

    if (createdUserIds.length > 0) {
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

    if (adminId) {
      await prisma.user.delete({
        where: { id: adminId },
      });
    }
    if (createdAdminIds.length > 1) {
      await prisma.user.deleteMany({
        where: { id: { in: createdAdminIds.slice(1) } },
      });
    }

    await prisma.$disconnect();
  });

  it("creates a valid reservation and calculates the total", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(30);
    const checkOut = futureDate(32);

    const response = await bookRoom(user.id, checkIn, checkOut);

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(user.id);
    expect(response.body.roomId).toBe(testRoomId);
    expect(Number(response.body.totalAmount)).toBe(200);
    expect(response.body.referenceId).toMatch(
      /^STY-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
    );

    const savedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(savedReservation.referenceId).toBe(response.body.referenceId);

    const history = await prisma.reservationHistory.findMany({
      where: { reservationId: response.body.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      actorId: user.id,
      action: "CREATED",
      visibility: "GUEST_VISIBLE",
      description: "Your reservation has been successfully received.",
    });

    const notifications = await prisma.notification.findMany({
      where: {
        type: "NEW_RESERVATION",
        referenceType: "RESERVATION",
        referenceId: response.body.id,
      },
      include: {
        recipients: {
          select: {
            userId: true,
            isRead: true,
            user: { select: { role: true } },
          },
        },
      },
    });
    expect(notifications).toHaveLength(1);
    const notification = notifications[0];

    expect(notification).toMatchObject({
      title: "New Reservation Received",
      message: "Reservation Tester has submitted a new reservation.",
    });
    expect(
      notification?.recipients
        .map(({ userId, isRead }) => ({ userId, isRead })),
    ).toEqual(
      expect.arrayContaining(
        createdAdminIds.map((id) => ({ userId: id, isRead: false })),
      ),
    );
    expect(
      notification?.recipients.every(({ user }) => user.role === "ADMIN"),
    ).toBe(true);

    const guestNotifications = await prisma.notificationRecipient.findMany({
      where: { notificationId: notification?.id, userId: user.id },
    });
    expect(guestNotifications).toHaveLength(0);

    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );
    const guestList = await request(app)
      .get("/api/notifications")
      .set("Cookie", `accessToken=${guestToken}`);
    expect(
      guestList.body.some(
        (item: { id: string }) => item.id === notification?.id,
      ),
    ).toBe(false);
    const guestMarkRead = await request(app)
      .patch(`/api/notifications/${notification?.id}/read`)
      .set("Cookie", `accessToken=${guestToken}`);
    expect(guestMarkRead.status).toBe(404);

    const adminToken = jwt.sign(
      { userId: createdAdminIds[0], role: "ADMIN" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );
    const adminList = await request(app)
      .get("/api/notifications")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(
      adminList.body.find(
        (item: { id: string }) => item.id === notification?.id,
      ),
    ).toMatchObject({
      id: notification?.id,
      type: "NEW_RESERVATION",
      referenceType: "RESERVATION",
      referenceId: response.body.id,
      readAt: null,
      isRead: false,
      reservation: {
        id: response.body.id,
        referenceId: response.body.referenceId,
        status: "PENDING",
        guestName: "Reservation Tester",
      },
    });

    const firstAdminToken = jwt.sign(
      { userId: createdAdminIds[0], role: "ADMIN" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );
    const secondAdminToken = jwt.sign(
      { userId: createdAdminIds[1], role: "ADMIN" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );
    const firstAdminUnreadBefore = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", `accessToken=${firstAdminToken}`);
    const secondAdminUnreadBefore = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", `accessToken=${secondAdminToken}`);
    const markRead = await request(app)
      .patch(`/api/notifications/${notification?.id}/read`)
      .set("Cookie", `accessToken=${firstAdminToken}`);
    expect(markRead.status).toBe(200);
    expect(markRead.body.isRead).toBe(true);
    const firstAdminUnreadAfter = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", `accessToken=${firstAdminToken}`);
    const secondAdminUnreadAfter = await request(app)
      .get("/api/notifications/unread-count")
      .set("Cookie", `accessToken=${secondAdminToken}`);
    expect(firstAdminUnreadAfter.body.count).toBe(
      firstAdminUnreadBefore.body.count - 1,
    );
    expect(secondAdminUnreadAfter.body.count).toBe(
      secondAdminUnreadBefore.body.count,
    );

    const recipientsAfterRead = await prisma.notificationRecipient.findMany({
      where: { notificationId: notification?.id },
      select: { userId: true, isRead: true },
    });
    expect(recipientsAfterRead).toContainEqual({
      userId: createdAdminIds[0],
      isRead: true,
    });
    expect(recipientsAfterRead).toContainEqual({
      userId: createdAdminIds[1],
      isRead: false,
    });

    const secondAdminList = await request(app)
      .get("/api/notifications")
      .set("Cookie", `accessToken=${secondAdminToken}`);
    expect(
      secondAdminList.body.find(
        (item: { id: string }) => item.id === notification?.id,
      ),
    ).toMatchObject({ isRead: false, readAt: null });

    const markAllRead = await request(app)
      .patch("/api/notifications/read-all")
      .set("Cookie", `accessToken=${secondAdminToken}`);
    expect(markAllRead.status).toBe(200);
    const recipientsAfterMarkAll = await prisma.notificationRecipient.findMany({
      where: { notificationId: notification?.id },
      select: { userId: true, isRead: true },
    });
    expect(recipientsAfterMarkAll).toContainEqual({
      userId: createdAdminIds[0],
      isRead: true,
    });
    expect(recipientsAfterMarkAll).toContainEqual({
      userId: createdAdminIds[1],
      isRead: true,
    });

    const confirmReservation = await request(app)
      .patch(`/api/reservations/${response.body.id}/status`)
      .set("Cookie", `accessToken=${secondAdminToken}`)
      .send({ status: "CONFIRMED" });
    expect(confirmReservation.status).toBe(200);
    const latestAdminNotifications = await request(app)
      .get("/api/notifications")
      .set("Cookie", `accessToken=${secondAdminToken}`);
    expect(
      latestAdminNotifications.body.find(
        (item: { id: string }) => item.id === notification?.id,
      )?.reservation,
    ).toMatchObject({
      referenceId: response.body.referenceId,
      status: "CONFIRMED",
      guestName: "Reservation Tester",
    });
  });

  it("does not create new reservation notifications for failed bookings", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(31);
    const checkOut = futureDate(33);
    const existingReservation = await createExistingReservation(
      user.id,
      checkIn,
      checkOut,
    );
    const response = await bookRoom(user.id, checkIn, checkOut);

    expect(response.status).toBe(409);
    expect(
      await prisma.notification.count({
        where: {
          type: "NEW_RESERVATION",
          referenceType: "RESERVATION",
          referenceId: existingReservation.id,
        },
      }),
    ).toBe(0);
  });

  it("rejects admin accounts from guest self-service reservation creation", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        roomId: testRoomId,
        checkIn: futureDate(33).toISOString(),
        checkOut: futureDate(35).toISOString(),
        guests: 2,
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  it("allows an admin to create a reservation for an existing user and calculates the total", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(35);
    const checkOut = futureDate(38);

    const response = await createAdminReservation(user.id, checkIn, checkOut);

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(user.id);
    expect(response.body.roomId).toBe(testRoomId);
    expect(Number(response.body.totalAmount)).toBe(300);
    expect(response.body.totalAmount).not.toBe(0.01);
    expect(response.body.referenceId).toMatch(
      /^STY-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
    );
    expect(response.body.user.email).toBe(user.email);

    const history = await prisma.reservationHistory.findMany({
      where: { reservationId: response.body.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      actorId: adminId,
      action: "CREATED",
      visibility: "GUEST_VISIBLE",
      description: "A reservation has been created for you.",
    });
    expect(
      await prisma.notification.count({
        where: {
          type: "NEW_RESERVATION",
          referenceType: "RESERVATION",
          referenceId: response.body.id,
        },
      }),
    ).toBe(0);
  });

  it("returns reservation details to an authorized admin", async () => {
    const user = await createTestUser();
    const reservation = await createExistingReservation(
      user.id,
      futureDate(42),
      futureDate(44),
    );

    const response = await request(app)
      .get(`/api/reservations/admin/${reservation.id}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(reservation.id);
    expect(response.body.referenceId).toBe(reservation.referenceId);
    expect(response.body.user.email).toBe(user.email);
    expect(response.body.room.roomType.name).toBeTruthy();
  });

  it("rejects guest access to admin reservation details", async () => {
    const user = await createTestUser();
    const reservation = await createExistingReservation(
      user.id,
      futureDate(45),
      futureDate(47),
    );
    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );

    const response = await request(app)
      .get(`/api/reservations/admin/${reservation.id}`)
      .set("Cookie", `accessToken=${guestToken}`);

    expect(response.status).toBe(403);
  });

  it("returns not found for an unknown admin reservation ID", async () => {
    const response = await request(app)
      .get(`/api/reservations/admin/${randomUUID()}`)
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reservation not found");
  });

  it("rejects guest access to admin reservation creation", async () => {
    const user = await createTestUser();
    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );

    const response = await request(app)
      .post("/api/reservations/admin")
      .set("Cookie", `accessToken=${guestToken}`)
      .send({
        userId: user.id,
        roomId: testRoomId,
        checkIn: futureDate(36).toISOString(),
        checkOut: futureDate(38).toISOString(),
        guests: 2,
      });

    expect(response.status).toBe(403);
  });

  it("rejects admin reservations for nonexistent users", async () => {
    const response = await createAdminReservation(
      randomUUID(),
      futureDate(37),
      futureDate(39),
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });

  it("rejects admin reservations for users with the ADMIN role", async () => {
    const adminGuest = await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "Account",
        email: `reservation-admin-guest-${randomUUID()}@example.com`,
        password: "test-password",
        role: "ADMIN",
      },
    });
    createdUserIds.push(adminGuest.id);

    const response = await createAdminReservation(
      adminGuest.id,
      futureDate(38),
      futureDate(40),
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Reservations can only be created for guests",
    );
    expect(
      await prisma.reservation.count({
        where: { userId: adminGuest.id },
      }),
    ).toBe(0);
  });

  it("rejects admin reservations for unavailable rooms", async () => {
    const user = await createTestUser();

    await prisma.room.update({
      where: { id: testRoomId },
      data: { status: "MAINTENANCE" },
    });

    try {
      const response = await createAdminReservation(
        user.id,
        futureDate(40),
        futureDate(42),
      );

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Room is not available for booking");
    } finally {
      await prisma.room.update({
        where: { id: testRoomId },
        data: { status: "AVAILABLE" },
      });
    }

  });

  it("rejects admin reservations that overlap an existing reservation", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(43);
    const checkOut = futureDate(46);
    await createExistingReservation(user.id, checkIn, checkOut);

    const response = await createAdminReservation(
      user.id,
      futureDate(44),
      futureDate(47),
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Room is already booked for the selected dates",
    );
  });

  it("rejects admin reservations that exceed room capacity", async () => {
    const user = await createTestUser();

    const response = await createAdminReservation(
      user.id,
      futureDate(48),
      futureDate(50),
      3,
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Number of guests exceeds room capacity of 2",
    );
  });

  it("allows an admin to edit a reservation without conflicting with itself and recalculates the total", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(52);
    const checkOut = futureDate(55);
    const original = await createExistingReservation(
      user.id,
      futureDate(50),
      futureDate(51),
      "PENDING",
    );

    const response = await editAdminReservation(
      original.id,
      user.id,
      checkIn,
      checkOut,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(original.id);
    expect(response.body.referenceId).toBe(original.referenceId);
    expect(response.body.status).toBe("PENDING");
    expect(Number(response.body.totalAmount)).toBe(300);
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.room.id).toBe(testRoomId);

    const history = await prisma.reservationHistory.findMany({
      where: { reservationId: original.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      actorId: adminId,
      action: "UPDATED",
      description:
        "Reservation details were updated by an administrator. Reason: Guest requested a reservation adjustment.",
      oldValues: {
        checkIn: original.checkIn.toISOString(),
        checkOut: original.checkOut.toISOString(),
      },
      newValues: {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
      },
    });

    const unchangedResponse = await editAdminReservation(
      original.id,
      user.id,
      checkIn,
      checkOut,
    );
    expect(unchangedResponse.status).toBe(200);
    expect(
      await prisma.reservationHistory.count({
        where: { reservationId: original.id },
      }),
    ).toBe(1);
  });

  it("allows a guest to edit their own pending reservation", async () => {
    const user = await createTestUser();
    const original = await createExistingReservation(
      user.id,
      futureDate(51),
      futureDate(52),
      "PENDING",
    );
    const checkIn = futureDate(54);
    const checkOut = futureDate(57);

    const response = await editGuestReservation(
      original.id,
      user.id,
      checkIn,
      checkOut,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(original.id);
    expect(response.body.status).toBe("PENDING");
    expect(Number(response.body.totalAmount)).toBe(300);
    expect(response.body.room.id).toBe(testRoomId);

    const history = await prisma.reservationHistory.findFirstOrThrow({
      where: { reservationId: original.id },
    });

    expect(history).toMatchObject({
      actorId: user.id,
      action: "UPDATED",
      visibility: "GUEST_VISIBLE",
    });
  });

  it("submits and approves an edit request with recalculated price and notifications", async () => {
    const user = await createTestUser();
    const reservation = await createExistingReservation(
      user.id,
      futureDate(60),
      futureDate(62),
      "CONFIRMED",
    );
    const checkIn = futureDate(64);
    const checkOut = futureDate(67);

    const submitted = await submitGuestRequest(reservation.id, user.id, {
      type: "EDIT",
      reason: "Our travel dates changed.",
      proposedChanges: {
        roomId: testRoomId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests: 1,
      },
    });

    expect(submitted.status).toBe(201);
    expect(submitted.body).toMatchObject({
      reservationId: reservation.id,
      guestId: user.id,
      type: "EDIT",
      status: "PENDING",
      reason: "Our travel dates changed.",
    });

    const duplicate = await submitGuestRequest(reservation.id, user.id, {
      type: "CANCELLATION",
      reason: "Plans changed.",
    });
    expect(duplicate.status).toBe(409);

    const adminNotifications = await prisma.notification.findMany({
      where: {
        type: "RESERVATION_REQUEST_SUBMITTED",
        referenceId: reservation.id,
        recipients: { some: { userId: adminId } },
      },
    });
    expect(adminNotifications).toHaveLength(1);
    expect(
      await prisma.reservationHistory.count({
        where: {
          reservationId: reservation.id,
          action: "EDIT_REQUESTED",
        },
      }),
    ).toBe(1);

    const reviewed = await request(app)
      .patch(`/api/reservations/requests/${submitted.body.id}/review`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        decision: "APPROVED",
        reviewReason: "The updated dates are available.",
      });

    expect(reviewed.status).toBe(200);
    expect(reviewed.body).toMatchObject({
      id: submitted.body.id,
      status: "APPROVED",
      reviewReason: "The updated dates are available.",
      reviewedBy: adminId,
    });

    const updatedReservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    expect(updatedReservation.checkIn.toISOString()).toBe(checkIn.toISOString());
    expect(updatedReservation.checkOut.toISOString()).toBe(checkOut.toISOString());
    expect(updatedReservation.guests).toBe(1);
    expect(Number(updatedReservation.totalAmount)).toBe(300);

    const guestNotifications = await prisma.notification.findMany({
      where: {
        type: "RESERVATION_REQUEST_REVIEWED",
        referenceId: reservation.id,
        recipients: { some: { userId: user.id } },
      },
    });
    expect(guestNotifications).toHaveLength(1);
    expect(
      await prisma.reservationHistory.count({
        where: {
          reservationId: reservation.id,
          action: "EDIT_APPROVED",
        },
      }),
    ).toBe(1);
  });

  it("hides requests from other guests and lets admins reject cancellation requests", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const reservation = await createExistingReservation(
      user.id,
      futureDate(70),
      futureDate(72),
      "CONFIRMED",
    );

    const forbiddenRequest = await submitGuestRequest(
      reservation.id,
      otherUser.id,
      { type: "CANCELLATION", reason: "Please cancel this stay." },
    );
    expect(forbiddenRequest.status).toBe(404);

    const submitted = await submitGuestRequest(reservation.id, user.id, {
      type: "CANCELLATION",
      reason: "I can no longer travel.",
    });
    expect(submitted.status).toBe(201);

    const reviewed = await request(app)
      .patch(`/api/reservations/requests/${submitted.body.id}/review`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        decision: "REJECTED",
        reviewReason: "The reservation cannot be cancelled at this time.",
      });

    expect(reviewed.status).toBe(200);
    expect(reviewed.body.status).toBe("REJECTED");
    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      }),
    ).toMatchObject({ status: "CONFIRMED" });
    expect(
      await prisma.reservationHistory.count({
        where: {
          reservationId: reservation.id,
          action: "CANCELLATION_REJECTED",
        },
      }),
    ).toBe(1);
  });

  it("approves cancellation requests and rejects stale edit proposals", async () => {
    const user = await createTestUser();
    const cancellationReservation = await createExistingReservation(
      user.id,
      futureDate(76),
      futureDate(78),
      "CONFIRMED",
    );
    const cancellationRequest = await submitGuestRequest(
      cancellationReservation.id,
      user.id,
      {
        type: "CANCELLATION",
        reason: "My plans have changed.",
      },
    );

    const cancellationReview = await request(app)
      .patch(`/api/reservations/requests/${cancellationRequest.body.id}/review`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        decision: "APPROVED",
        reviewReason: "Cancellation approved.",
      });

    expect(cancellationReview.status).toBe(200);
    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: { id: cancellationReservation.id },
      }),
    ).toMatchObject({ status: "CANCELLED" });

    const staleReservation = await createExistingReservation(
      user.id,
      futureDate(80),
      futureDate(82),
      "CONFIRMED",
    );
    const staleRequest = await submitGuestRequest(staleReservation.id, user.id, {
      type: "EDIT",
      reason: "Please move my dates.",
      proposedChanges: {
        roomId: testRoomId,
        checkIn: futureDate(84).toISOString(),
        checkOut: futureDate(86).toISOString(),
        guests: 1,
      },
    });

    await prisma.reservation.update({
      where: { id: staleReservation.id },
      data: { guests: 1 },
    });
    const staleReview = await request(app)
      .patch(`/api/reservations/requests/${staleRequest.body.id}/review`)
      .set("Cookie", `accessToken=${accessToken}`)
      .send({
        decision: "APPROVED",
        reviewReason: "The reservation changed after submission.",
      });

    expect(staleReview.status).toBe(409);
    expect(staleReview.body.message).toContain(
      "The reservation changed after this request was submitted",
    );
    expect(
      await prisma.reservationRequest.findUniqueOrThrow({
        where: { id: staleRequest.body.id },
      }),
    ).toMatchObject({ status: "PENDING" });
    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: { id: staleReservation.id },
      }),
    ).toMatchObject({ status: "CONFIRMED", guests: 1 });
  });

  it("does not allow a guest to edit another guest's reservation", async () => {
    const owner = await createTestUser();
    const otherGuest = await createTestUser();
    const reservation = await createExistingReservation(
      owner.id,
      futureDate(58),
      futureDate(60),
      "PENDING",
    );

    const response = await editGuestReservation(
      reservation.id,
      otherGuest.id,
      futureDate(61),
      futureDate(63),
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reservation not found");
  });

  it("does not allow a guest to edit a confirmed reservation", async () => {
    const user = await createTestUser();
    const reservation = await createExistingReservation(
      user.id,
      futureDate(64),
      futureDate(66),
      "CONFIRMED",
    );

    const response = await editGuestReservation(
      reservation.id,
      user.id,
      futureDate(67),
      futureDate(69),
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Only pending reservations can be edited",
    );
  });

  it("rejects edits that overlap another active reservation", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const original = await createExistingReservation(
      user.id,
      futureDate(56),
      futureDate(58),
      "PENDING",
    );
    await createExistingReservation(
      otherUser.id,
      futureDate(60),
      futureDate(63),
    );

    const response = await editAdminReservation(
      original.id,
      user.id,
      futureDate(61),
      futureDate(64),
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Room is already booked for the selected dates",
    );
  });

  it("rejects edits with nonexistent users, excess guests, or unavailable rooms", async () => {
    const user = await createTestUser();
    const original = await createExistingReservation(
      user.id,
      futureDate(65),
      futureDate(67),
      "PENDING",
    );

    const missingUserResponse = await editAdminReservation(
      original.id,
      randomUUID(),
      futureDate(68),
      futureDate(70),
    );
    expect(missingUserResponse.status).toBe(404);
    expect(missingUserResponse.body.message).toBe("User not found");

    const capacityResponse = await editAdminReservation(
      original.id,
      user.id,
      futureDate(68),
      futureDate(70),
      3,
    );
    expect(capacityResponse.status).toBe(400);
    expect(capacityResponse.body.message).toBe(
      "Number of guests exceeds room capacity of 2",
    );

    await prisma.room.update({
      where: { id: testRoomId },
      data: { status: "MAINTENANCE" },
    });
    try {
      const unavailableRoomResponse = await editAdminReservation(
        original.id,
        user.id,
        futureDate(68),
        futureDate(70),
      );
      expect(unavailableRoomResponse.status).toBe(409);
      expect(unavailableRoomResponse.body.message).toBe(
        "Room is not available for booking",
      );
    } finally {
      await prisma.room.update({
        where: { id: testRoomId },
        data: { status: "AVAILABLE" },
      });
    }

    expect(
      await prisma.reservationHistory.count({
        where: { reservationId: original.id },
      }),
    ).toBe(0);
  });

  it("does not allow guests to edit reservations and rejects terminal reservations", async () => {
    const user = await createTestUser();
    const reservation = await createExistingReservation(
      user.id,
      futureDate(72),
      futureDate(74),
      "CANCELLED",
    );
    const guestToken = jwt.sign(
      { userId: user.id, role: "GUEST" },
      process.env.JWT_ACCESS_TOKEN_SECRET as string,
      { expiresIn: "5m" },
    );

    const guestResponse = await request(app)
      .patch(`/api/reservations/admin/${reservation.id}`)
      .set("Cookie", `accessToken=${guestToken}`)
      .send({
        userId: user.id,
        roomId: testRoomId,
        checkIn: futureDate(75).toISOString(),
        checkOut: futureDate(77).toISOString(),
        guests: 2,
      });
    expect(guestResponse.status).toBe(403);

    const terminalResponse = await editAdminReservation(
      reservation.id,
      user.id,
      futureDate(75),
      futureDate(77),
    );
    expect(terminalResponse.status).toBe(400);
    expect(terminalResponse.body.message).toBe(
      "Only pending or confirmed reservations can be edited",
    );
  });

  it("provides an admin availability lookup that excludes the reservation being edited", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(78);
    const checkOut = futureDate(80);
    const reservation = await createExistingReservation(
      user.id,
      checkIn,
      checkOut,
      "PENDING",
    );

    const response = await request(app)
      .get("/api/rooms/availability/admin")
      .query({
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        excludeReservationId: reservation.id,
      })
      .set("Cookie", `accessToken=${accessToken}`);

    expect(response.status).toBe(200);
    expect(
      response.body.some((room: { id: string }) => room.id === testRoomId),
    ).toBe(true);
  });

  it("allows only one of two simultaneous overlapping bookings", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const checkIn = futureDate(100);
    const checkOut = futureDate(102);

    // Both guests attempt to book the same room for the same dates.
    const responses = await Promise.all([
      bookRoom(userA.id, checkIn, checkOut),
      bookRoom(userB.id, checkIn, checkOut),
    ]);

    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409]);

    const conflictResponse = responses.find(
      (response) => response.status === 409,
    );

    expect(conflictResponse?.body.message).toBe(
      "Room is already booked for the selected dates",
    );

    // Verify that exactly one active reservation exists for this period.
    const activeReservationCount = await prisma.reservation.count({
      where: {
        roomId: testRoomId,
        status: { not: "CANCELLED" },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });

    expect(activeReservationCount).toBe(1);
  });

  it("rejects overlapping reservations", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(40);
    const checkOut = futureDate(43);

    await createExistingReservation(user.id, checkIn, checkOut);

    const response = await bookRoom(user.id, futureDate(41), futureDate(44));

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Room is already booked for the selected dates",
    );
  });

  it("allows back-to-back reservations", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(50);
    const checkOut = futureDate(52);

    await createExistingReservation(user.id, checkIn, checkOut);

    const response = await bookRoom(user.id, checkOut, futureDate(54));

    expect(response.status).toBe(201);
  });

  it("allows booking dates occupied only by a cancelled reservation", async () => {
    const user = await createTestUser();
    const checkIn = futureDate(60);
    const checkOut = futureDate(62);

    await createExistingReservation(user.id, checkIn, checkOut, "CANCELLED");

    const response = await bookRoom(user.id, checkIn, checkOut);

    expect(response.status).toBe(201);
  });

  it("rejects booking a room that is not available", async () => {
    const user = await createTestUser();

    await prisma.room.update({
      where: { id: testRoomId },
      data: { status: "MAINTENANCE" },
    });

    try {
      const response = await bookRoom(user.id, futureDate(70), futureDate(72));

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("Room is not available for booking");
    } finally {
      await prisma.room.update({
        where: { id: testRoomId },
        data: { status: "AVAILABLE" },
      });
    }
  });

  it("rejects a booking that exceeds room capacity", async () => {
    const user = await createTestUser();

    const response = await bookRoom(user.id, futureDate(80), futureDate(82), 3);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Number of guests exceeds room capacity of 2",
    );
  });

  it("returns 404 when the requested room does not exist", async () => {
    const user = await createTestUser();

    const response = await bookRoom(
      user.id,
      futureDate(90),
      futureDate(92),
      2,
      randomUUID(),
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Room not found");
  });
});
