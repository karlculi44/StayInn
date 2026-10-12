import dotenv from "dotenv";
import app from "./app.js";
import { cleanupRefreshTokens } from "./utils/cleanupRefreshTokens.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`StayInn server running on port ${PORT}`);

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
