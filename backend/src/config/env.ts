import { z } from "zod";
import { resolve } from "node:path";

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

const hostSchema = z.enum(["127.0.0.1", "0.0.0.0"]).optional();

const profileImageSizeSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(20))
  .optional()
  .transform((value) => value ?? 5);

const minimumProductionJwtSecretLength = 32;
const knownJwtSecretPlaceholders = new Set([
  "replace-with-a-random-local-only-access-secret",
  "replace-with-a-different-local-only-refresh-secret",
  "stayinn-test-access-secret",
  "stayinn-test-refresh-secret",
  "change-me",
  "changeme",
  "your-secret",
  "placeholder",
]);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_URL: databaseUrlSchema,
    JWT_ACCESS_TOKEN_SECRET: z.string().min(1),
    JWT_REFRESH_TOKEN_SECRET: z.string().min(1),
    FRONTEND_URL: frontendOriginSchema.optional(),
    LAN_FRONTEND_URL: frontendOriginSchema.optional(),
    PORT: portSchema,
    HOST: hostSchema,
    PROFILE_IMAGE_UPLOAD_DIR: z.string().trim().min(1).optional(),
    PROFILE_IMAGE_MAX_SIZE_MB: profileImageSizeSchema,
    ROOM_TYPE_IMAGE_UPLOAD_DIR: z.string().trim().min(1).optional(),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === "production" &&
      environment.LAN_FRONTEND_URL !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["LAN_FRONTEND_URL"],
      });
    }

    if (environment.NODE_ENV !== "production") {
      return;
    }

    if (environment.FRONTEND_URL === undefined) {
      context.addIssue({
        code: "custom",
        path: ["FRONTEND_URL"],
      });
    }

    for (const variable of [
      "JWT_ACCESS_TOKEN_SECRET",
      "JWT_REFRESH_TOKEN_SECRET",
    ] as const) {
      const secret = environment[variable];

      if (
        knownJwtSecretPlaceholders.has(secret.trim().toLowerCase()) ||
        /^(replace|change|your|example|placeholder|sample|dummy|test|development)([-_: ]|$)/i.test(
          secret.trim(),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [variable],
        });
      }

      if (secret.length < minimumProductionJwtSecretLength) {
        context.addIssue({
          code: "custom",
          path: [variable],
        });
      }
    }

    if (
      environment.JWT_ACCESS_TOKEN_SECRET ===
      environment.JWT_REFRESH_TOKEN_SECRET
    ) {
      context.addIssue({
        code: "custom",
        path: ["JWT_ACCESS_TOKEN_SECRET"],
      });
      context.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_TOKEN_SECRET"],
      });
    }
  })
  .transform((environment) => ({
    ...environment,
    FRONTEND_URL: environment.FRONTEND_URL ?? "http://localhost:5173",
    HOST:
      environment.HOST ??
      (environment.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
    PROFILE_IMAGE_UPLOAD_DIR: resolve(
      environment.PROFILE_IMAGE_UPLOAD_DIR ?? "uploads/profile-images",
    ),
    ROOM_TYPE_IMAGE_UPLOAD_DIR: resolve(
      environment.ROOM_TYPE_IMAGE_UPLOAD_DIR ?? "uploads/room-types",
    ),
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
