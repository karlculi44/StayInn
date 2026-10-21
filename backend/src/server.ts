import "dotenv/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/runtime.js";
import app from "./app.js";
import { cleanupRefreshTokens } from "./utils/cleanupRefreshTokens.js";

export function startServer(): void {
  app.listen(env.PORT, env.HOST, () => {
    console.log(`StayInn server running on port ${env.PORT}`);

    cleanupRefreshTokens().catch((error) => {
      console.error("Initial refresh token cleanup failed:", error);
    });

    setInterval(
      () => {
        cleanupRefreshTokens().catch((error) => {
          console.error("Refresh token cleanup failed:", error);
        });
      },
      60 * 60 * 1000,
    );
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void startServer();
}
