import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";

let adminId = "";
let guestId = "";
let roomTypeId = "";
let roomId = "";
let adminToken = "";
let guestToken = "";

const monthKey = (date: Date) => date.toISOString().slice(0, 7);

describe("Monthly booking trends", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        firstName: "Trends",
        lastName: "Admin",
        email: `trends-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    adminId = admin.id;

    const guest = await prisma.user.create({
      data: {
        firstName: "Trends",
        lastName: "Guest",
        email: `trends-guest-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "GUEST",
      },
    });
    guestId = guest.id;

    adminToken = jwt.sign(
      { userId: adminId, role: "ADMIN" },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" },
    );
    guestToken = jwt.sign(
      { userId: guestId, role: "GUEST" },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" },
    );

    const roomType = await prisma.roomType.create({
      data: {
        name: `Trends Test ${randomUUID()}`,
        description: "Temporary room type for monthly booking trends tests",
        capacity: 2,
        pricePerNight: "100.00",
      },
    });
    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomNumber: `TR-${randomUUID()}`,
        roomTypeId,
      },
    });
    roomId = room.id;
  });

  afterAll(async () => {
    if (adminId || guestId) {
      await prisma.reservation.deleteMany({
        where: { userId: { in: [adminId, guestId].filter(Boolean) } },
      });
    }

    if (roomId) {
      await prisma.room.deleteMany({ where: { id: roomId } });
    }

    if (roomTypeId) {
      await prisma.roomType.deleteMany({ where: { id: roomTypeId } });
    }

    if (adminId || guestId) {
      await prisma.user.deleteMany({
        where: { id: { in: [adminId, guestId].filter(Boolean) } },
      });
    }

    await prisma.$disconnect();
  });

  it("returns 12 chronological months and counts cancelled bookings by createdAt", async () => {
    const beforeResponse = await request(app)
      .get("/api/admin/dashboard/monthly-booking-trends")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(beforeResponse.status).toBe(200);
    expect(beforeResponse.body).toHaveLength(12);

    const latestMonth = new Date(
      `${beforeResponse.body[11].month}-01T00:00:00.000Z`,
    );
    const firstMonth = new Date(
      Date.UTC(
        latestMonth.getUTCFullYear(),
        latestMonth.getUTCMonth() - 11,
        1,
      ),
    );
    const createdAt = new Date(
      Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth(), 15, 12),
    );
    const expectedMonths = Array.from({ length: 12 }, (_, index) =>
      monthKey(
        new Date(
          Date.UTC(
            firstMonth.getUTCFullYear(),
            firstMonth.getUTCMonth() + index,
            1,
          ),
        ),
      ),
    );

    await prisma.reservation.create({
      data: {
        referenceId: `TRENDS-${randomUUID()}`,
        checkIn: new Date("2099-01-10T00:00:00.000Z"),
        checkOut: new Date("2099-01-12T00:00:00.000Z"),
        guests: 1,
        totalAmount: "100.00",
        status: "CANCELLED",
        userId: guestId,
        roomId,
        createdAt,
      },
    });

    const response = await request(app)
      .get("/api/admin/dashboard/monthly-booking-trends")
      .set("Cookie", `accessToken=${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(12);
    expect(response.body.map((entry: { month: string }) => entry.month)).toEqual(
      expectedMonths,
    );
    expect(
      response.body.every(
        (entry: { reservationCount: number }) =>
          Number.isInteger(entry.reservationCount) && entry.reservationCount >= 0,
      ),
    ).toBe(true);

    const expectedMonthIndex = response.body.findIndex(
      (entry: { month: string }) => entry.month === monthKey(createdAt),
    );
    expect(expectedMonthIndex).toBeGreaterThanOrEqual(0);
    expect(response.body[expectedMonthIndex].reservationCount).toBe(
      beforeResponse.body[expectedMonthIndex].reservationCount + 1,
    );

    for (const [index, entry] of response.body.entries()) {
      if (index !== expectedMonthIndex) {
        expect(entry.reservationCount).toBe(
          beforeResponse.body[index].reservationCount,
        );
      }
    }
  });

  it("supports date range presets and rejects unknown ranges", async () => {
    const expectedLengths = {
      today: 24,
      "3d": 3,
      week: 7,
      "7d": 7,
      "3w": 21,
      "30d": 30,
      "3m": 13,
      "12m": 12,
    };

    for (const [range, length] of Object.entries(expectedLengths)) {
      const response = await request(app)
        .get(`/api/admin/dashboard/monthly-booking-trends?range=${range}`)
        .set("Cookie", `accessToken=${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(length);
    }

    const invalid = await request(app)
      .get("/api/admin/dashboard/monthly-booking-trends?range=bogus")
      .set("Cookie", `accessToken=${adminToken}`);
    expect(invalid.status).toBe(400);
  });

  it("requires administrator authorization", async () => {
    const unauthenticatedResponse = await request(app).get(
      "/api/admin/dashboard/monthly-booking-trends",
    );
    expect(unauthenticatedResponse.status).toBe(401);

    const guestResponse = await request(app)
      .get("/api/admin/dashboard/monthly-booking-trends")
      .set("Cookie", `accessToken=${guestToken}`);
    expect(guestResponse.status).toBe(403);
  });
});
