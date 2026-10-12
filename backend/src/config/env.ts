import { z } from "zod";

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

const frontendOriginSchema = z
  .string()
  .refine((value) => {
    const url = parseUrl(value);

    return url !== undefined && (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username === "" &&
      url.password === "" &&
      (url.pathname === "" || url.pathname === "/") &&
      url.search === "" &&
      url.hash === ""
    );
  })
  .transform((value) => new URL(value).origin);

const databaseUrlSchema = z.string().refine((value) => {
  const url = parseUrl(value);
  return (
    url !== undefined &&
    (url.protocol === "postgres:" || url.protocol === "postgresql:")
  );
});

const portSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535))
  .optional()
  .transform((value) => value ?? 5000);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_URL: databaseUrlSchema,
    JWT_ACCESS_TOKEN_SECRET: z
      .string()
      .refine((value) => value.trim().length > 0),
    JWT_REFRESH_TOKEN_SECRET: z
      .string()
      .refine((value) => value.trim().length > 0),
    FRONTEND_URL: frontendOriginSchema.optional(),
    PORT: portSchema,
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === "production" &&
      environment.FRONTEND_URL === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["FRONTEND_URL"],
      });
    }
  })
  .transform((environment) => ({
    ...environment,
    FRONTEND_URL: environment.FRONTEND_URL ?? "http://localhost:5173",
  }));

export type Environment = z.output<typeof environmentSchema>;

export function parseEnv(
  input: Record<string, string | undefined>,
): Environment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    const invalidVariables = result.error.issues
      .map((issue) => issue.path[0])
      .filter((variable): variable is string => typeof variable === "string");
    const variableNames = [...new Set(invalidVariables)];

    throw new Error(
      `Invalid environment configuration: ${variableNames.join(", ") || "unknown variable"}`,
    );
  }

  return result.data;
}
