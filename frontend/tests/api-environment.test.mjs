import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getApiBaseUrl,
  validateApiUrl,
} from "../src/config/env.ts";

describe("getApiBaseUrl", () => {
  it("uses the Vite proxy for development regardless of the configured API URL", () => {
    assert.equal(getApiBaseUrl(undefined, false), "/api");
    assert.equal(
      getApiBaseUrl("http://192.168.1.20:5000/api", false),
      "/api",
    );
  });

  it("uses and validates the configured API URL in production", () => {
    assert.equal(
      getApiBaseUrl("https://api.example.com/api", true),
      "https://api.example.com/api",
    );
    assert.throws(
      () => getApiBaseUrl(undefined, true),
      /VITE_API_URL is required/,
    );
  });
});

describe("validateApiUrl", () => {
  it("rejects a missing API URL", () => {
    assert.throws(
      () => validateApiUrl(undefined, false),
      /VITE_API_URL is required/,
    );
    assert.throws(() => validateApiUrl("", false), /VITE_API_URL is required/);
  });

  it("rejects malformed or unsupported URLs", () => {
    assert.throws(
      () => validateApiUrl("not-a-url", false),
      /valid HTTP or HTTPS URL/,
    );
    assert.throws(
      () => validateApiUrl("ftp://api.example.com", false),
      /valid HTTP or HTTPS URL/,
    );
  });

  it("allows localhost API URLs in development", () => {
    assert.equal(
      validateApiUrl("http://localhost:5000/api", false),
      "http://localhost:5000/api",
    );
  });

  it("allows valid HTTPS API URLs in production", () => {
    assert.equal(
      validateApiUrl("https://api.example.com/api", true),
      "https://api.example.com/api",
    );
  });

  it("rejects public HTTP API URLs in production", () => {
    assert.throws(
      () => validateApiUrl("http://api.example.com/api", true),
      /must use HTTPS in production/,
    );
  });

  it("rejects malformed API URLs in production", () => {
    assert.throws(
      () => validateApiUrl("not-a-url", true),
      /valid HTTP or HTTPS URL/,
    );
  });

  it("rejects local and private hosts in production", () => {
    for (const value of [
      "http://localhost:5000/api",
      "http://127.0.0.1:5000/api",
      "http://[::1]:5000/api",
      "http://api.local/api",
      "http://host.docker.internal:5000/api",
      "http://192.168.1.20:5000/api",
    ]) {
      assert.throws(
        () => validateApiUrl(value, true),
        /must not use a local or private host in production/,
      );
    }
  });
});
