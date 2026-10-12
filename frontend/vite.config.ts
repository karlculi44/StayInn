import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { validateApiUrl } from "./src/config/env.js";

export default defineConfig(({ mode, command }) => {
  const environment = loadEnv(mode, process.cwd(), "VITE_");

  validateApiUrl(
    environment.VITE_API_URL,
    mode === "production" || command === "build",
  );

  return {
    plugins: [react(), tailwindcss()],
  };
});
