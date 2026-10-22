import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { loadConfigFromFile } from "vite";

const environmentKeys = ["API_PROXY_TARGET", "DEV_ALLOWED_HOSTS", "VITE_API_URL"];
const originalEnvironment = new Map(
  environmentKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("Vite server configuration", () => {
  it("proxies /api to the configured backend without changing host or paths", async () => {
    process.env.API_PROXY_TARGET = "http://127.0.0.1:5001";
    process.env.DEV_ALLOWED_HOSTS = "stayinn-pc.office.example";

    const result = await loadConfigFromFile(
      {
        command: "serve",
        mode: "lan",
        isSsrBuild: false,
        isPreview: false,
      },
      "vite.config.ts",
      process.cwd(),
      "silent",
    );
    const config = result?.config;

    assert.ok(config);
    assert.equal(config.server.proxy["/api"].target, "http://127.0.0.1:5001");
    assert.equal(config.server.proxy["/api"].changeOrigin, false);
    assert.deepEqual(config.server.allowedHosts, [
      "stayinn-pc.office.example",
    ]);
  });

  it("does not configure a development proxy for production builds", async () => {
    process.env.API_PROXY_TARGET = "not-a-proxy-target";
    process.env.VITE_API_URL = "https://api.example.com/api";

    const result = await loadConfigFromFile(
      {
        command: "build",
        mode: "production",
        isSsrBuild: false,
        isPreview: false,
      },
      "vite.config.ts",
      process.cwd(),
      "silent",
    );
    const config = result?.config;

    assert.ok(config);
    assert.equal(config.server, undefined);
  });
});
