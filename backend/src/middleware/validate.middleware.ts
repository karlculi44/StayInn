import type { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

type ValidationTarget = "body" | "query" | "params";

export const validate = (
  schema: ZodType,
  target: ValidationTarget = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });

      return;
    }

    if (target === "body") {
      req.body = result.data;
    } else {
      req.validated = result.data;
    }

    next();
  };
};
