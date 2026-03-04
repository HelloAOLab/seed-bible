import * as esbuild from "esbuild";
import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";

if (existsSync("lib/dist")) {
  await rm("lib/dist", { recursive: true });
}

const entryPoints = (await readdir("lib", { withFileTypes: true }))
  .filter((dirent) => dirent.isFile())
  .map((file) => path.join(file.parentPath, file.name));

await esbuild.build({
  entryPoints,
  assetNames: "assets/[name]-[hash]",
  entryNames: "[name]-[hash]",
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: "lib/dist",
  format: "esm",
  platform: "browser",
  target: ["es2022"],
});
