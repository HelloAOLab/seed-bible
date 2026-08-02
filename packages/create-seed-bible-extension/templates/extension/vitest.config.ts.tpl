import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      // Points "seed-bible"/etc at a resolvable stub so `vi.mock(...)` in
      // your tests can intercept them — see src/__mocks__/ for why.
      "seed-bible/components": path.join(here, "src/__mocks__/seed-bible-components.ts"),
      "seed-bible/i18n": path.join(here, "src/__mocks__/seed-bible-i18n.ts"),
      "seed-bible": path.join(here, "src/__mocks__/seed-bible.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
