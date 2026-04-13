import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/db",
      "packages/shared",
      "packages/adapter-utils",
      "packages/adapters/codex-local",
      "packages/adapters/opencode-local",
      "packages/adapters/pi-local",
      "packages/adapters/openclaw-gateway",
      "packages/mcp-server",
      "server",
      "ui",
      "cli",
    ],
  },
});
