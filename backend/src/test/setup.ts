import "dotenv/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must be configured before running tests.");
}

const databaseName = new URL(testDatabaseUrl).pathname.slice(1);

if (databaseName !== "stayinn_test") {
  throw new Error(
    `Tests must use stayinn_test, but the configured database is "${databaseName}".`,
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
