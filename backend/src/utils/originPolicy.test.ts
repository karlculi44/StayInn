import { describe, expect, it } from "vitest";
import {
  getAllowedFrontendOrigins,
  isRequestOriginAllowed,
  isTrustedOrigin,
} from "./originPolicy.js";

const trustedOrigin = "https://stayinn.example";

describe("request Origin policy", () => {
  it("accepts the exact configured frontend origin", () => {
    expect(isTrustedOrigin(trustedOrigin, trustedOrigin)).toBe(true);
  });

  it("allows only exact matches from configured frontend origins", () => {
    const lanOrigin = "http://192.168.1.25:5173";
    const allowedOrigins = [trustedOrigin, lanOrigin];

    expect(
      isRequestOriginAllowed(lanOrigin, allowedOrigins, "development"),
    ).toBe(true);
    expect(
      isRequestOriginAllowed("http://192.168.1.26:5173", allowedOrigins, "development"),
    ).toBe(false);
  });

  it("keeps localhost development origins allowed alongside the configured LAN origin", () => {
    const allowedOrigins = getAllowedFrontendOrigins(
      [trustedOrigin, "http://192.168.1.25:5173"],
      "development",
    );

    expect(
      isRequestOriginAllowed("http://localhost:5173", allowedOrigins, "development"),
    ).toBe(true);
    expect(
      isRequestOriginAllowed("http://127.0.0.1:5173", allowedOrigins, "development"),
    ).toBe(true);
    expect(
      isRequestOriginAllowed("http://192.168.1.25:5173", allowedOrigins, "development"),
    ).toBe(true);
    expect(
      isRequestOriginAllowed("http://192.168.1.26:5173", allowedOrigins, "development"),
    ).toBe(false);
  });

  it("does not add development origins to the production allowlist", () => {
    expect(getAllowedFrontendOrigins(trustedOrigin, "production")).toEqual([
      trustedOrigin,
    ]);
  });

  it("rejects an untrusted origin without suffix matching", () => {
    expect(
      isTrustedOrigin("https://stayinn.example.attacker.test", trustedOrigin),
    ).toBe(false);
  });

  it.each(["null", "not-an-origin", "https://stayinn.example/path"])(
    "rejects invalid Origin values",
    (origin) => {
      expect(isTrustedOrigin(origin, trustedOrigin)).toBe(false);
    },
  );

  it("rejects an origin with a different scheme or port", () => {
    expect(isTrustedOrigin("http://stayinn.example", trustedOrigin)).toBe(
      false,
    );
    expect(isTrustedOrigin("https://stayinn.example:8443", trustedOrigin)).toBe(
      false,
    );
  });

  it("rejects missing Origin in production", () => {
    expect(
      isRequestOriginAllowed(undefined, trustedOrigin, "production"),
    ).toBe(false);
  });

  it.each(["development", "test"] as const)(
    "allows missing Origin in %s only",
    (nodeEnv) => {
      expect(
        isRequestOriginAllowed(undefined, trustedOrigin, nodeEnv),
      ).toBe(true);
      expect(
        isRequestOriginAllowed("null", trustedOrigin, nodeEnv),
      ).toBe(false);
    },
  );
});
