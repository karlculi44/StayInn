import "dotenv/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./config/env.js";

export async function startServer(
  input: Record<string, string | undefined> = process.env,
): Promise<void> {
  const env = parseEnv(input);
  const [{ default: app }, { cleanupRefreshTokens }] = await Promise.all([
    import("./app.js"),
    import("./utils/cleanupRefreshTokens.js"),
  ]);

  app.listen(env.PORT, () => {
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
