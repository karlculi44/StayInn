import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app.js";
import { env } from "../config/runtime.js";
import { prisma } from "../lib/prisma.js";
import {
  getRoomTypeImageKey,
  readRoomTypeImage,
  removeRoomTypeImage,
} from "../services/roomTypeImage.js";

const pngImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/J1sAAAAASUVORK5CYII=",
  "base64",
);
const createdRoomTypeIds: string[] = [];
const createdImageUrls = new Set<string>();

let adminId = "";
let guestId = "";
let adminCookie = "";
let guestCookie = "";

const createRoomType = (name = `Upload Test ${randomUUID()}`) =>
  request(app)
    .post("/api/room-types")
    .set("Cookie", adminCookie)
    .field("name", name)
    .field("description", "Room type image upload integration test")
    .field("capacity", "2")
    .field("pricePerNight", "100");

const uploadPng = (name: string, image = pngImage) =>
  createRoomType(name).attach("image", image, {
    filename: "thumbnail.png",
    contentType: "image/png",
  });

describe("Room type thumbnail upload", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        firstName: "Room Type",
        lastName: "Admin",
        email: `room-type-admin-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "ADMIN",
      },
    });
    const guest = await prisma.user.create({
      data: {
        firstName: "Room Type",
        lastName: "Guest",
        email: `room-type-guest-${randomUUID()}@example.com`,
        password: "test-password-hash",
        role: "GUEST",
      },
    });
    adminId = admin.id;
    guestId = guest.id;
    adminCookie = `accessToken=${jwt.sign(
      { userId: adminId, role: "ADMIN" },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" },
    )}`;
    guestCookie = `accessToken=${jwt.sign(
      { userId: guestId, role: "GUEST" },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" },
    )}`;
  });

  afterEach(async () => {
    if (createdRoomTypeIds.length > 0) {
      await prisma.roomType.deleteMany({
        where: { id: { in: createdRoomTypeIds } },
      });
      createdRoomTypeIds.length = 0;
    }

    for (const imageUrl of createdImageUrls) {
      await removeRoomTypeImage(imageUrl);
    }
    createdImageUrls.clear();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, guestId] } },
    });
    await prisma.$disconnect();
  });

  it("creates a room type without an image", async () => {
    const response = await createRoomType();

    expect(response.status).toBe(201);
    expect(response.body.image).toBeNull();
    createdRoomTypeIds.push(response.body.id);
  });

  it("uploads and serves a validated image for admins", async () => {
    const response = await uploadPng(`Room Type Image ${randomUUID()}`);

    expect(response.status).toBe(201);
    createdRoomTypeIds.push(response.body.id);
    createdImageUrls.add(response.body.image);
    expect(response.body.image).toMatch(
      /^\/api\/room-types\/images\/[0-9a-f-]+\.png$/i,
    );

    const key = getRoomTypeImageKey(response.body.image);
    if (!key) throw new Error("Generated room image URL has no safe key");

    const imageResponse = await request(app).get(response.body.image);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers["content-type"]).toContain("image/png");
    expect(imageResponse.body).toEqual(pngImage);
  });

  it("rejects uploads from unauthenticated and non-admin users", async () => {
    const unauthenticatedResponse = await request(app)
      .post("/api/room-types")
      .field("name", `Unauthenticated ${randomUUID()}`)
      .field("description", "Unauthenticated")
      .field("capacity", "2")
      .field("pricePerNight", "100")
      .attach("image", pngImage, {
        filename: "thumbnail.png",
        contentType: "image/png",
      });
    expect(unauthenticatedResponse.status).toBe(401);

    const guestResponse = await request(app)
      .post("/api/room-types")
      .set("Cookie", guestCookie)
      .field("name", `Unauthorized ${randomUUID()}`)
      .field("description", "Unauthorized")
      .field("capacity", "2")
      .field("pricePerNight", "100")
      .attach("image", pngImage, {
        filename: "thumbnail.png",
        contentType: "image/png",
      });
    expect(guestResponse.status).toBe(403);
  });

  it("rejects unsupported, spoofed, and oversized uploads", async () => {
    const unsupportedResponse = await createRoomType(
      `Unsupported ${randomUUID()}`,
    ).attach("image", Buffer.from("<svg></svg>"), {
      filename: "thumbnail.svg",
      contentType: "image/svg+xml",
    });
    expect(unsupportedResponse.status).toBe(415);

    const spoofedResponse = await uploadPng(
      `Spoofed ${randomUUID()}`,
      Buffer.from("<script>not an image</script>"),
    );
    expect(spoofedResponse.status).toBe(400);

    const oversizedResponse = await uploadPng(
      `Oversized ${randomUUID()}`,
      Buffer.alloc(5 * 1024 * 1024 + 1),
    );
    expect(oversizedResponse.status).toBe(413);
  });

  it("preserves an existing image when updating without a replacement", async () => {
    const created = await uploadPng(`Preserve ${randomUUID()}`);
    expect(created.status).toBe(201);
    createdRoomTypeIds.push(created.body.id);
    createdImageUrls.add(created.body.image);

    const updateResponse = await request(app)
      .patch(`/api/room-types/${created.body.id}`)
      .set("Cookie", adminCookie)
      .field("name", created.body.name)
      .field("description", "Updated description")
      .field("capacity", "3")
      .field("pricePerNight", "150");

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.image).toBe(created.body.image);
    expect(updateResponse.body.description).toBe("Updated description");
  });

  it("replaces an image and removes the old local file after update", async () => {
    const created = await uploadPng(`Replace ${randomUUID()}`);
    expect(created.status).toBe(201);
    createdRoomTypeIds.push(created.body.id);
    createdImageUrls.add(created.body.image);

    const updateResponse = await request(app)
      .patch(`/api/room-types/${created.body.id}`)
      .set("Cookie", adminCookie)
      .field("name", created.body.name)
      .field("description", created.body.description)
      .field("capacity", "2")
      .field("pricePerNight", "100")
      .attach("image", pngImage, {
        filename: "replacement.png",
        contentType: "image/png",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.image).not.toBe(created.body.image);
    createdImageUrls.add(updateResponse.body.image);

    const oldKey = getRoomTypeImageKey(created.body.image);
    if (!oldKey) throw new Error("Original room image URL has no safe key");
    await expect(readRoomTypeImage(oldKey)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
