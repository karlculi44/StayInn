import "dotenv/config";
import { defineConfig } from "prisma/config";
import { validateTestDatabaseUrl } from "./src/test/testDatabaseUrl.js";

const testDatabaseUrl = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: testDatabaseUrl,
  },
});
