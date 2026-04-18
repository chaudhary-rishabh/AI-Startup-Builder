import { defineConfig } from "vitest/config";

/** Shared defaults for Vitest across packages. Per-package configs own coverage rules. */
export const baseConfig = defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
  },
});

export default baseConfig;
