import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: "jsdom",
    globals: true,
    // Seed Bible's shared components import their CSS, which Node can't
    // load, so Vitest handles `seed-bible` itself instead of leaving it to
    // Node.
    server: { deps: { inline: ["seed-bible"] } },
  },
});
