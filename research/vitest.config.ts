import { defineConfig } from "vitest/config";

// Sandbox artefacts under programs/, generator fixtures, and archived run
// sandboxes under results/sandboxes/ carry node:test suites that run inside
// experiment sandboxes with their own runners; vitest must not collect them.
export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/programs/**",
      "**/fixtures/**",
      "**/results/sandboxes/**",
    ],
  },
});
