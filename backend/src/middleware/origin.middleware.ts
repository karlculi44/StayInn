import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { isRequestOriginAllowed } from "../utils/originPolicy.js";
import { env } from "../config/runtime.js";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
      [
        env.FRONTEND_URL,
        ...(env.LAN_FRONTEND_URL ? [env.LAN_FRONTEND_URL] : []),
      ],
      env.NODE_ENV,
    )
  ) {
    next(new AppError("Invalid request origin", 403));
    return;
  }

  next();
}
