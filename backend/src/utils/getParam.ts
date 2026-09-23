import { AppError } from "./AppError.js";

export const getStringParam = (
  value: string | string[] | undefined,
  name: string,
) => {
  if (typeof value !== "string") {
    throw new AppError(`Invalid ${name}`, 400);
  }

  return value;
};
