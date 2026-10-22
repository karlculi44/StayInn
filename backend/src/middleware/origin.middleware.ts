import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import {
  getAllowedFrontendOrigins,
  isRequestOriginAllowed,
} from "../utils/originPolicy.js";
import { env } from "../config/runtime.js";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const allowedFrontendOrigins = getAllowedFrontendOrigins(
  [
    env.FRONTEND_URL,
    ...(env.LAN_FRONTEND_URL ? [env.LAN_FRONTEND_URL] : []),
  ],
  env.NODE_ENV,
);

export function verifyRequestOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!stateChangingMethods.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (
    !isRequestOriginAllowed(
      req.get("Origin"),
      allowedFrontendOrigins,
      env.NODE_ENV,
      req.get("host") ? `${req.protocol}://${req.get("host")}` : undefined,
    )
  ) {
    next(new AppError("Invalid request origin", 403));
    return;
  }

  next();
}
