// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://www.all4fun.co.il",
  trailingSlash: "never",
  integrations: [sitemap()],
  build: { format: "file" },
});
