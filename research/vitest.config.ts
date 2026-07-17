import { defineConfig } from "vitest/config";

// Sandbox artefacts under programs/ and generator fixtures carry node:test
// suites that run inside experiment sandboxes with their own runners; vitest
// must not collect them.
export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/programs/**",
      "**/fixtures/**",
    ],
  },
});
