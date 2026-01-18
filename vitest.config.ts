import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/observability.test.ts", "tests/lsp-frontmatter.test.ts"],
    environment: "node",
    globals: false,
  },
});
