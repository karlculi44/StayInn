import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import {
  validateApiUrl,
  validateProfileImageMaxSizeMb,
} from "./src/config/env.js";

export default defineConfig(({ mode, command }) => {
  const environment = loadEnv(mode, process.cwd(), "VITE_");

  validateApiUrl(
    environment.VITE_API_URL,
    mode === "production" || command === "build",
    mode === "lan",
  );
  validateProfileImageMaxSizeMb(environment.VITE_PROFILE_IMAGE_MAX_SIZE_MB);

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: [
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-popover",
        "@radix-ui/react-select",
        "cmdk",
      ],
    },
  };
});
