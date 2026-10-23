import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExtensionProjectInfo } from "../lib/project.js";
import { readIcon } from "../lib/icon.js";
import {
  isSandboxedProject,
  readProjectSources,
} from "../lib/sandboxedProject.js";
import { SET_FILE, writeSitePackage } from "../lib/sitePackage.js";
import { runBuild } from "./build.js";

export interface PackageOptions {
  /** The Seed Bible the install page links to. */
  appUrl?: string;
}

/**
 * Builds the extension and writes `dist/site/`: everything needed to
 * install it, as static files to upload to any static host.
 */
export async function runPackage(
  options: PackageOptions,
  root: string = process.cwd()
): Promise<number> {
  if (!isSandboxedProject(await readProjectSources(root))) {
    console.error(
      '[package] Only a sandboxed extension can be installed from a link, and this one registers itself with registerExtension(). Write it with defineExtension() from "seed-bible/extensions" instead.'
    );
    return 1;
  }
  const buildCode = await runBuild({ standalone: true }, root);
  if (buildCode !== 0) {
    console.error("[package] Aborting: build failed.");
    return buildCode;
  }

  const info = await loadExtensionProjectInfo(root);
  const outDir = path.join(root, "dist", "site");
  await writeSitePackage({
    outDir,
    bundle: await readFile(path.join(root, "dist", "standalone", "index.js")),
    meta: info.meta,
    icon: await readIcon(root, info.meta),
    appUrl: options.appUrl,
  });

  console.log(`
[package] Wrote ${outDir}

Upload that folder to any static host. For example:

  GitHub Pages:       publish dist/site with GitHub Actions (projects from
                      create-seed-bible-extension include a workflow for it)
  Cloudflare Pages:   npx wrangler pages deploy dist/site
  Cloudflare Workers: npx wrangler deploy, with "assets": { "directory":
                      "./dist/site" } in wrangler.jsonc

Then share the page it's hosted at (it has an Install button), or the
${SET_FILE} link inside it, which users can paste into Seed Bible's
Settings > Extensions > "Add extensions from a link".

Bump "version" in extension.json for each release you upload.
`);
  return 0;
}
