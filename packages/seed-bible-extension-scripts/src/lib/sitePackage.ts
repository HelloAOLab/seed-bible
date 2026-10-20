import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionProjectMeta } from "./project.js";

export const SET_FILE = "extension-set.json";
export const DEFAULT_APP_URL = "https://seedbible.org/";

export interface SitePackageOptions {
  /** Where to write the folder. Emptied first. */
  outDir: string;
  /** The built sandboxed bundle. */
  bundle: Uint8Array;
  meta: ExtensionProjectMeta;
  /** The Seed Bible the install page sends people to. */
  appUrl?: string;
}

/**
 * Writes a folder of static files that installs the extension from any
 * static host (GitHub Pages, Cloudflare Pages or Workers, Netlify, S3…):
 *
 * - the bundle, named by its hash, so a cached manifest can never point
 *   at a newer or older bundle than the one its `integrity` describes;
 * - `extension-set.json`, linking the bundle relative to itself, so the
 *   folder works at whatever address it's served from;
 * - `index.html`, a page with an install button for Seed Bible;
 * - `_headers`, so Cloudflare (and Netlify) let Seed Bible fetch the files
 *   (GitHub Pages already does), and `.nojekyll`, so GitHub Pages serves
 *   the folder as it is.
 */
export async function writeSitePackage(
  options: SitePackageOptions
): Promise<{ files: string[] }> {
  const { outDir, bundle, meta } = options;
  const digest = createHash("sha384").update(bundle).digest();
  const bundleFile = `${meta.id}-${digest.toString("hex").slice(0, 12)}.js`;
  const set = {
    id: meta.id,
    extensions: [
      {
        url: `./${bundleFile}`,
        meta: { ...meta, integrity: `sha384-${digest.toString("base64")}` },
      },
    ],
  };

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const files: Record<string, string | Uint8Array> = {
    [bundleFile]: bundle,
    [SET_FILE]: `${JSON.stringify(set, null, 2)}\n`,
    "index.html": installPage(meta, options.appUrl ?? DEFAULT_APP_URL),
    _headers: HEADERS,
    ".nojekyll": "",
  };
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(outDir, name), content);
  }
  return { files: Object.keys(files) };
}

// Seed Bible fetches the manifest and bundle from its own page, so they
// need CORS. The manifest must not be cached long, or an update would take
// that long to reach anyone; the bundle's name changes with every build, so
// it can be cached for good.
const HEADERS = `/${SET_FILE}
  Access-Control-Allow-Origin: *
  Cache-Control: no-cache

/*.js
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable
`;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * A page for people who follow a link to the extension. The install link is
 * worked out in the browser, from the page's own address, because the
 * package doesn't know where it will be hosted.
 */
function installPage(meta: ExtensionProjectMeta, appUrl: string): string {
  const en = meta.translations.en ?? Object.values(meta.translations)[0];
  const title = escapeHtml(en?.title ?? meta.id);
  const description = escapeHtml(en?.description ?? "");
  const config = JSON.stringify({ id: meta.id, appUrl, setFile: SET_FILE })
    // Can't end the script early, whatever the id or URL contains.
    .replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} for Seed Bible</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { max-width: 36rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
  a.install { display: inline-block; padding: 0.75rem 1.25rem; border-radius: 0.5rem; background: #e07b4c; color: #fff; text-decoration: none; font-weight: 600; }
  code { word-break: break-all; }
  .note { opacity: 0.75; font-size: 0.9rem; }
</style>
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<p><a class="install" id="install" href="#">Install in Seed Bible</a></p>
<p class="note">Seed Bible shows what it will be able to do and asks before installing anything. You can also paste this link into Settings &gt; Extensions &gt; "Add extensions from a link":</p>
<p><code id="link"></code></p>
<script>
  const config = ${config};
  const setUrl = new URL(config.setFile, location.href).href;
  const install = new URL(config.appUrl);
  install.searchParams.set("extensionSet", setUrl);
  install.searchParams.set("autoinstall-" + config.id, "true");
  document.getElementById("install").href = install.href;
  document.getElementById("link").textContent = setUrl;
</script>
</body>
</html>
`;
}
