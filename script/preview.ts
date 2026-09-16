// Builds a production bundle and serves it the way the real production host
// does: the SSR host server (server/dist/index.js) rendering pages, with a
// separate static server standing in for the CDN that hashed client assets
// are normally loaded from (the host itself never serves them from disk).
//
// `bun build`'s NODE_ENV check is resolved at bundle time, not at runtime, so
// the build has to run with NODE_ENV=production or the compiled server
// bundle permanently boots as the Vite dev server regardless of how it's
// later invoked.
import { execSync, spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import express from "express";

const PORT = process.env.PORT ?? "3002";
const ASSET_PORT = process.env.ASSET_PORT ?? "4173";
const ASSET_HOST = `http://localhost:${ASSET_PORT}`;
const CLIENT_DIR = path.resolve("standalone/dist/client");

console.log("Building (NODE_ENV=production)...");
execSync("pnpm build", {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

const assetApp = express();
assetApp.use(express.static(CLIENT_DIR));
const assetServer = assetApp.listen(Number(ASSET_PORT), () => {
  console.log(`Serving built client assets at ${ASSET_HOST}`);
});

const host: ChildProcess = spawn("bun", ["run", "server/dist/index.js"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "production",
    STORE_BACKEND: "dev",
    STORE_DIR: "standalone/dist",
    ASSET_HOST,
    PORT,
  },
});

function shutdown(): void {
  assetServer.close();
  host.kill();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
host.on("exit", (code) => {
  assetServer.close();
  process.exit(code ?? 0);
});

console.log(`\nPreview running at http://localhost:${PORT} (Ctrl+C to stop)\n`);
