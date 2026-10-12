import { describe, expect, it } from "vitest";
import {
  isRequestOriginAllowed,
  isTrustedOrigin,
} from "./originPolicy.js";

const trustedOrigin = "https://stayinn.example";

describe("request Origin policy", () => {
  it("accepts the exact configured frontend origin", () => {
    expect(isTrustedOrigin(trustedOrigin, trustedOrigin)).toBe(true);
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
