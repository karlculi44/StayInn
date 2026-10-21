import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "../config/runtime.js";
import { AppError } from "../utils/AppError.js";

const imageTypes = {
  "image/jpeg": {
    extension: "jpg",
    contentType: "image/jpeg",
  },
  "image/png": {
    extension: "png",
    contentType: "image/png",
  },
  "image/webp": {
    extension: "webp",
    contentType: "image/webp",
  },
} as const;

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pngEndChunk = Buffer.from([
  0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);
const profilePictureKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export type ProfilePictureFormat =
  (typeof imageTypes)[keyof typeof imageTypes];

function isSupportedImageType(
  contentType: string,
): contentType is keyof typeof imageTypes {
  return Object.hasOwn(imageTypes, contentType);
}

function getSafeProfilePicturePath(key: string) {
  if (!profilePictureKeyPattern.test(key)) {
    throw new AppError("Profile picture not found", 404);
  }

  return resolve(env.PROFILE_IMAGE_UPLOAD_DIR, key);
}

function matchesImageFormat(
  image: Buffer,
  contentType: keyof typeof imageTypes,
): boolean {
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

export function validateProfilePicture(
  image: Buffer,
  contentTypeHeader: string | undefined,
): ProfilePictureFormat {
  const contentType = contentTypeHeader
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (!contentType || !isSupportedImageType(contentType)) {
    throw new AppError("Only JPEG, PNG, and WebP images are supported", 415);
  }

  if (image.length === 0) {
    throw new AppError("Profile picture cannot be empty", 400);
  }

  if (image.length > env.PROFILE_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    throw new AppError(
      `Profile picture must be no larger than ${env.PROFILE_IMAGE_MAX_SIZE_MB} MB`,
      413,
    );
  }

  if (!matchesImageFormat(image, contentType)) {
    throw new AppError(
      "Image content does not match the selected image format",
      400,
    );
  }

  return imageTypes[contentType];
}

export async function storeProfilePicture(
  image: Buffer,
  extension: ProfilePictureFormat["extension"],
): Promise<string> {
  const key = `${randomUUID()}.${extension}`;
  const destination = getSafeProfilePicturePath(key);
  const temporaryPath = resolve(
    env.PROFILE_IMAGE_UPLOAD_DIR,
    `.${randomUUID()}.tmp`,
  );

  await mkdir(env.PROFILE_IMAGE_UPLOAD_DIR, { recursive: true });

  try {
    await writeFile(temporaryPath, image, { flag: "wx" });
    await rename(temporaryPath, destination);
  } catch (error: unknown) {
    try {
      await rm(temporaryPath, { force: true });
    } catch (cleanupError: unknown) {
      console.error("Unable to clean up temporary profile image:", cleanupError);
    }

    throw error;
  }

  return key;
}

export async function readProfilePicture(key: string) {
  const contentType = Object.values(imageTypes).find(
    (format) => key.endsWith(`.${format.extension}`),
  )?.contentType;

  if (!contentType) {
    throw new AppError("Profile picture not found", 404);
  }

  try {
    return {
      image: await readFile(getSafeProfilePicturePath(key)),
      contentType,
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new AppError("Profile picture not found", 404);
    }

    throw error;
  }
}

export async function removeProfilePicture(key: string) {
  await rm(getSafeProfilePicturePath(key), { force: true });
}

export function getProfilePictureUrl(key: string | null) {
  return key
    ? `/api/auth/me/profile-picture?v=${encodeURIComponent(key)}`
    : null;
}
