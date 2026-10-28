import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "../config/runtime.js";
import { AppError } from "../utils/AppError.js";

const imageTypes = {
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
  "image/png": { extension: "png", contentType: "image/png" },
  "image/webp": { extension: "webp", contentType: "image/webp" },
} as const;

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pngEndChunk = Buffer.from([
  0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);
const imageKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
const imageUrlPrefix = "/api/room-types/images/";

type ImageContentType = keyof typeof imageTypes;

function isImageContentType(value: string): value is ImageContentType {
  return Object.hasOwn(imageTypes, value);
}

function matchesImageFormat(image: Buffer, contentType: ImageContentType) {
  if (contentType === "image/jpeg") {
    return (
      image.length >= 4 &&
      image[0] === 0xff &&
      image[1] === 0xd8 &&
      image[2] === 0xff &&
      image[image.length - 2] === 0xff &&
      image[image.length - 1] === 0xd9
    );
  }

  if (contentType === "image/png") {
    return (
      image.length >= 20 &&
      image.subarray(0, pngSignature.length).equals(pngSignature) &&
      image.subarray(-pngEndChunk.length).equals(pngEndChunk)
    );
  }

  return (
    image.length >= 16 &&
    image.toString("ascii", 0, 4) === "RIFF" &&
    image.readUInt32LE(4) === image.length - 8 &&
    image.toString("ascii", 8, 12) === "WEBP"
  );
}

function getSafeImagePath(key: string) {
  if (!imageKeyPattern.test(key)) {
    throw new AppError("Room type image not found", 404);
  }

  return resolve(env.ROOM_TYPE_IMAGE_UPLOAD_DIR, key);
}

export function getRoomTypeImageUrl(key: string) {
  return `${imageUrlPrefix}${key}`;
}

export function getRoomTypeImageKey(imageUrl: string | null) {
  if (!imageUrl?.startsWith(imageUrlPrefix)) {
    return null;
  }

  const key = imageUrl.slice(imageUrlPrefix.length);
  return imageKeyPattern.test(key) ? key : null;
}

export async function storeRoomTypeImage(
  image: Buffer,
  mimeType: string,
): Promise<{ key: string; imageUrl: string }> {
  const contentType = mimeType.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || !isImageContentType(contentType)) {
    throw new AppError("Only JPEG, PNG, and WebP images are supported", 415);
  }
  if (image.length === 0) {
    throw new AppError("Image cannot be empty", 400);
  }
  if (image.length > 5 * 1024 * 1024) {
    throw new AppError("Image must be no larger than 5 MB", 413);
  }
  if (!matchesImageFormat(image, contentType)) {
    throw new AppError(
      "Image content does not match the selected image format",
      400,
    );
  }

  const key = `${randomUUID()}.${imageTypes[contentType].extension}`;
  const destination = getSafeImagePath(key);
  const temporaryPath = resolve(
    env.ROOM_TYPE_IMAGE_UPLOAD_DIR,
    `.${randomUUID()}.tmp`,
  );

  await mkdir(env.ROOM_TYPE_IMAGE_UPLOAD_DIR, { recursive: true });
  try {
    await writeFile(temporaryPath, image, { flag: "wx" });
    await rename(temporaryPath, destination);
  } catch (error: unknown) {
    try {
      await rm(temporaryPath, { force: true });
    } catch (cleanupError: unknown) {
      console.error("Unable to clean up temporary room type image:", cleanupError);
    }
    throw error;
  }

  return { key, imageUrl: getRoomTypeImageUrl(key) };
}

export async function readRoomTypeImage(key: string) {
  const contentType = Object.values(imageTypes).find((format) =>
    key.endsWith(`.${format.extension}`),
  )?.contentType;
  if (!contentType) {
    throw new AppError("Room type image not found", 404);
  }

  try {
    const image = await readFile(getSafeImagePath(key));
    if (!matchesImageFormat(image, contentType)) {
      throw new AppError("Room type image is invalid", 415);
    }
    return { image, contentType };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new AppError("Room type image not found", 404);
    }
    throw error;
  }
}

export async function removeRoomTypeImage(imageUrl: string | null) {
  const key = getRoomTypeImageKey(imageUrl);
  if (key) {
    await rm(getSafeImagePath(key), { force: true });
  }
}
