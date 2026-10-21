import type { Environment } from "../config/env.js";

const serializedOriginPattern = /^https?:\/\/[^/?#]+$/i;
const localDevelopmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function getAllowedFrontendOrigins(
  frontendOrigins: string | readonly string[],
  nodeEnv: Environment["NODE_ENV"],
): string[] {
  const configuredOrigins =
    typeof frontendOrigins === "string" ? [frontendOrigins] : frontendOrigins;

  if (nodeEnv === "production") {
    return [...configuredOrigins];
  }

  return [...new Set([...configuredOrigins, ...localDevelopmentOrigins])];
}

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
  frontendOrigins: string | readonly string[],
  nodeEnv: Environment["NODE_ENV"],
): boolean {
  if (origin === undefined) {
    return nodeEnv !== "production";
  }

  const allowedOrigins =
    typeof frontendOrigins === "string" ? [frontendOrigins] : frontendOrigins;

  return allowedOrigins.some((frontendOrigin) =>
    isTrustedOrigin(origin, frontendOrigin),
  );
}
