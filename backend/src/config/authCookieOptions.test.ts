import { describe, expect, it } from "vitest";
import { getAuthCookieOptions } from "./authCookieOptions.js";

describe("authentication cookie options", () => {
  it("uses cross-site secure cookies in production", () => {
    expect(getAuthCookieOptions("production")).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
  });

  it("keeps cookies compatible with local HTTP development and tests", () => {
    expect(getAuthCookieOptions("development")).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    expect(getAuthCookieOptions("test")).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });
});
