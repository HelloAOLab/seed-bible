// Smoke test: load the built SSR bundle and render a page in Node.
// Surfaces any SSR-safety issues (window/document access at construction or
// during synchronous effects) that only appear at render time.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(path.join(root, "dist/client/.vite/manifest.json"), "utf8")
);

const { render } = await import(
  pathToFileURL(path.join(root, "dist/server/entry-server.js")).href
);

const html = await render({
  url: "/d/branch-develop/?translation=BSB&book=GEN&chapter=1",
  config: {
    basePath: "/d/branch-develop",
    assetHost: "https://assets.seedbible.com",
  },
  manifest,
});

// Basic assertions.
const checks = {
  "has <!doctype": html.startsWith("<!doctype html>"),
  "injects __APP_CONFIG__": html.includes("window.__APP_CONFIG__"),
  // Assets are now namespaced per branch/build under a versioned prefix, e.g.
  // https://assets.seedbible.com/branches/<branch>/<buildId>/assets/...
  "asset on versioned CDN prefix":
    /https:\/\/assets\.seedbible\.com\/branches\/[^/]+\/[^/]+\/assets\//.test(
      html
    ),
  "rendered app markup (non-empty #app)": /<div id="app">\s*<\S/.test(html),
};
console.log("HTML length:", html.length);
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? "PASS" : "FAIL"}  ${k}`);
}
console.log("\n--- head excerpt ---\n" + html.slice(0, 900));
if (Object.values(checks).some((v) => !v)) process.exit(1);
