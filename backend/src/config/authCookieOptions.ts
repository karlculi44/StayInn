import type { Environment } from "./env.js";

export function getAuthCookieOptions(
  nodeEnv: Environment["NODE_ENV"],
) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: nodeEnv === "production" ? ("none" as const) : ("lax" as const),
    path: "/",
  };
}
