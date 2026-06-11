import { renderToString } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";

/** A single chunk record from a Vite client manifest. */
interface ManifestChunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  imports?: string[];
}

export type ViteManifest = Record<string, ManifestChunk>;

export interface RenderOptions {
  /** Full request path including the deployment prefix, e.g. "/d/branch-x/?book=GEN". */
  url: string;
  /** Deployment config injected into the page and passed to the app. */
  config: AppConfig;
  /** The build's Vite client manifest (loaded by the host from S3). */
  manifest: ViteManifest;
}

/** Locates the client entry chunk in the manifest. */
function findEntry(manifest: ViteManifest): ManifestChunk | undefined {
  return (
    Object.values(manifest).find(
      (c) => c.isEntry && c.src?.includes("standalone/index")
    ) ?? Object.values(manifest).find((c) => c.isEntry)
  );
}

/** Collects the entry's JS file plus all CSS reachable through its imports. */
function collectAssets(manifest: ViteManifest): { js?: string; css: string[] } {
  const entry = findEntry(manifest);
  if (!entry) return { js: undefined, css: [] };

  const css = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    chunk.css?.forEach((c) => css.add(c));
    chunk.imports?.forEach(visit);
  };
  // Walk from the entry by its manifest key.
  const entryKey = Object.keys(manifest).find((k) => manifest[k] === entry);
  if (entryKey) visit(entryKey);

  return { js: entry.file, css: [...css] };
}

const assetUrl = (assetHost: string, file: string): string =>
  assetHost ? `${assetHost.replace(/\/$/, "")}/${file}` : `/${file}`;

const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

/**
 * Server-side renders the app to a complete HTML document.
 *
 * The app shell (chrome, theme, head) renders on the server; verse content
 * is fetched and filled in by the client after hydration — standard for a
 * data-driven SPA that does not block first paint on network fetches.
 */
export async function render(options: RenderOptions): Promise<string> {
  const { url, config, manifest } = options;

  const appHtml = renderToString(
    <Main config={config} initialHref={`http://ssr.local${url}`} />
  );

  const { js, css } = collectAssets(manifest);
  const cssLinks = css
    .map(
      (file) =>
        `<link rel="stylesheet" crossorigin href="${assetUrl(config.assetHost, file)}">`
    )
    .join("\n    ");
  const entryScript = js
    ? `<script type="module" crossorigin src="${assetUrl(config.assetHost, js)}"></script>`
    : "";

  const configJson = escapeForScript(JSON.stringify(config));

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seed Bible</title>
    <script>window.__APP_CONFIG__ = ${configJson};</script>
    ${cssLinks}
    ${entryScript}
  </head>
  <body>
    <div id="app">${appHtml}</div>
  </body>
</html>`;
}
