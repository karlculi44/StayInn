import type { Environment } from "../config/env.js";

const serializedOriginPattern = /^https?:\/\/[^/?#]+$/i;

export function isTrustedOrigin(
  origin: string | undefined,
  frontendOrigin: string,
): boolean {
  if (!origin || origin === "null" || !serializedOriginPattern.test(origin)) {
    return false;
  }

  try {
    const requestUrl = new URL(origin);
    const frontendUrl = new URL(frontendOrigin);

    return (
      requestUrl.username === "" &&
      requestUrl.password === "" &&
      requestUrl.pathname === "/" &&
      requestUrl.search === "" &&
      requestUrl.hash === "" &&
      requestUrl.origin === frontendUrl.origin
    );
  } catch {
    return false;
  }
}

export function isRequestOriginAllowed(
  origin: string | undefined,
  frontendOrigin: string,
  nodeEnv: Environment["NODE_ENV"],
): boolean {
  if (origin === undefined) {
    return nodeEnv !== "production";
  }

  return isTrustedOrigin(origin, frontendOrigin);
}
