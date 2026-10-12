const allowedLoopbackHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

export function validateTestDatabaseUrl(
  value: string | undefined,
): string {
  if (!value) {
    throw new Error("TEST_DATABASE_URL is required.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (url.pathname.slice(1) !== "stayinn_test") {
    throw new Error("TEST_DATABASE_URL must target the stayinn_test database.");
  }

  if (!allowedLoopbackHosts.has(url.hostname.toLowerCase())) {
    throw new Error(
      "TEST_DATABASE_URL must use a loopback host (localhost, 127.0.0.1, or ::1).",
    );
  }

  return value;
}
