import { describe, expect, it } from "vitest";
import { env } from "../config/runtime.js";
import { validateProfilePicture } from "./profilePicture.js";

const pngImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/J1sAAAAASUVORK5CYII=",
  "base64",
);

describe("profile picture validation", () => {
  it("accepts a PNG whose content matches its declared type", () => {
    expect(validateProfilePicture(pngImage, "image/png")).toEqual({
      extension: "png",
      contentType: "image/png",
    });
  });

  it("rejects a mismatched image content type", () => {
    expect(() =>
      validateProfilePicture(pngImage, "image/jpeg"),
    ).toThrow("Image content does not match");
  });

  it("rejects unsupported or missing content types", () => {
    expect(() =>
      validateProfilePicture(pngImage, "image/svg+xml"),
    ).toThrow("Only JPEG, PNG, and WebP images are supported");
    expect(() => validateProfilePicture(pngImage, undefined)).toThrow(
      "Only JPEG, PNG, and WebP images are supported",
    );
  });

  it("rejects image data over the configured size limit", () => {
    const oversizedImage = Buffer.alloc(
      env.PROFILE_IMAGE_MAX_SIZE_MB * 1024 * 1024 + 1,
    );

    expect(() =>
      validateProfilePicture(oversizedImage, "image/png"),
    ).toThrow("no larger than");
  });
});
