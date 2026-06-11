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
  /**
   * The HTML that the app should be injected into.
   *
   * Should have the following placeholders:
   * - `<!--APP_HTML-->` where the app's rendered HTML should be injected.
   * - `<!--CONFIG_JSON-->` where the JSON-serialized config should be injected (for hydration).
   * - `<!--META-->` where any additional meta tags should be injected (optional).
   *
   * The host server loads this from disk at startup and passes it to the render function on each request, allowing it to be customized or overridden per request if needed.
   * By default, it is just the contents of `index.html` in the project root.
   */
  html: string;
}

/** Locates the client entry chunk in the manifest. */
// function findEntry(manifest: ViteManifest): ManifestChunk | undefined {
//   return (
//     Object.values(manifest).find(
//       (c) => c.isEntry && c.src?.includes("standalone/index")
//     ) ?? Object.values(manifest).find((c) => c.isEntry)
//   );
// }

/** Collects the entry's JS file plus all CSS reachable through its imports. */
// function collectAssets(manifest: ViteManifest): { js?: string; css: string[] } {
//   const entry = findEntry(manifest);
//   if (!entry) return { js: undefined, css: [] };

//   const css = new Set<string>();
//   const seen = new Set<string>();
//   const visit = (key: string) => {
//     if (seen.has(key)) return;
//     seen.add(key);
//     const chunk = manifest[key];
//     if (!chunk) return;
//     chunk.css?.forEach((c) => css.add(c));
//     chunk.imports?.forEach(visit);
//   };
//   // Walk from the entry by its manifest key.
//   const entryKey = Object.keys(manifest).find((k) => manifest[k] === entry);
//   if (entryKey) visit(entryKey);

//   return { js: entry.file, css: [...css] };
// }

// const assetUrl = (assetHost: string, file: string): string =>
//   assetHost ? `${assetHost.replace(/\/$/, "")}/${file}` : `/${file}`;

const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

/**
 * Server-side renders the app to a complete HTML document.
 *
 * The app shell (chrome, theme, head) renders on the server; verse content
 * is fetched and filled in by the client after hydration — standard for a
 * data-driven SPA that does not block first paint on network fetches.
 */
export async function render(options: RenderOptions): Promise<string> {
  const { url, config } = options;

  const appHtml = renderToString(
    <Main config={config} initialHref={`http://ssr.local${url}`} />
  );

  const metaHtml = renderToString(
    <>
      <title>Seed Bible</title>
    </>
  );

  // const { js, css } = collectAssets(manifest);
  // const cssLinks = css
  //   .map(
  //     (file) =>
  //       `<link rel="stylesheet" crossorigin href="${assetUrl(config.assetHost, file)}">`
  //   )
  //   .join("\n    ");
  // const entryScript = js
  //   ? `<script type="module" crossorigin src="${assetUrl(config.assetHost, js)}"></script>`
  //   : "";

  const configJson = escapeForScript(JSON.stringify(config));

  return options.html
    .replace("<!--META-->", metaHtml) // No additional meta tags for now, but this allows it to be customized per request in the future if needed.
    .replace("<!--CONFIG_JSON-->", configJson)
    .replace("<!--APP_HTML-->", appHtml);
}
