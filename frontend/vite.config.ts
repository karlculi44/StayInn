import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import {
  validateApiUrl,
  validateProfileImageMaxSizeMb,
} from "./src/config/env.js";

export default defineConfig(({ mode, command }) => {
  const environment = loadEnv(mode, process.cwd(), [
    "VITE_",
    "API_PROXY_TARGET",
    "DEV_ALLOWED_HOSTS",
  ]);

  if (mode === "production" || command === "build") {
    validateApiUrl(environment.VITE_API_URL, true);
  }
  validateProfileImageMaxSizeMb(environment.VITE_PROFILE_IMAGE_MAX_SIZE_MB);

  let server: ReturnType<typeof createDevelopmentServer> | undefined;
  if (command === "serve") {
    const proxyTarget =
      environment.API_PROXY_TARGET?.trim() || "http://127.0.0.1:5000";
    let proxyTargetUrl: URL;
    try {
      proxyTargetUrl = new URL(proxyTarget);
    } catch {
      throw new Error("API_PROXY_TARGET must be a valid HTTP or HTTPS origin.");
    }

    if (
      (proxyTargetUrl.protocol !== "http:" &&
        proxyTargetUrl.protocol !== "https:") ||
      proxyTargetUrl.username !== "" ||
      proxyTargetUrl.password !== "" ||
      (proxyTargetUrl.pathname !== "" && proxyTargetUrl.pathname !== "/") ||
      proxyTargetUrl.search !== "" ||
      proxyTargetUrl.hash !== ""
    ) {
      throw new Error("API_PROXY_TARGET must be a valid HTTP or HTTPS origin.");
    }

    const allowedHosts = environment.DEV_ALLOWED_HOSTS?.split(",")
      .map((host) => host.trim())
      .filter(Boolean);
    server = createDevelopmentServer(proxyTargetUrl.origin, allowedHosts);
  }

  return {
    plugins: [react(), tailwindcss()],
    ...(server ? { server } : {}),
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

function createDevelopmentServer(
  proxyTarget: string,
  allowedHosts: string[] | undefined,
) {
  return {
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: false,
      },
    },
    ...(allowedHosts?.length ? { allowedHosts } : {}),
  };
}
