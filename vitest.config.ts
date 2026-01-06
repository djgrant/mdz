import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only include vitest-style tests (observability)
    include: ["tests/observability.test.ts"],
    environment: "node",
    globals: false,
  },
});
