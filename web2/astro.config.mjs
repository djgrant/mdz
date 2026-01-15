import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { fileURLToPath } from "node:url";

export default defineConfig({
  integrations: [mdx()],
  vite: {
    assetsInclude: ["**/*.mdz"],
    resolve: {
      alias: {
        "@web2": fileURLToPath(new URL("./src", import.meta.url)),
        "@zenmarkdown/core": fileURLToPath(
          new URL("../packages/core/src/index.ts", import.meta.url),
        ),
      },
    },
  },
});
