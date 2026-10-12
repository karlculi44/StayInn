import "dotenv/config";
import { validateTestDatabaseUrl } from "./testDatabaseUrl.js";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_TOKEN_SECRET = "stayinn-test-access-secret";
process.env.JWT_REFRESH_TOKEN_SECRET = "stayinn-test-refresh-secret";

const testDatabaseUrl = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = testDatabaseUrl;
