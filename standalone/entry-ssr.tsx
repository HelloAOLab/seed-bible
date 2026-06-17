import { renderToStringAsync } from "preact-render-to-string";
import { Main } from "../packages/seed-bible/seed-bible/app/main";
import type { AppConfig } from "../packages/seed-bible/seed-bible/app/appConfig";
import { createSeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

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
  path: string;

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

const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

/**
 * Server-side renders the app to a complete HTML document.
 *
 * The app shell (chrome, theme, head) renders on the server; verse content
 * is fetched and filled in by the client after hydration — standard for a
 * data-driven SPA that does not block first paint on network fetches.
 */
export async function render(options: RenderOptions): Promise<string> {
  console.log("Rendering!");
  const { path, config } = options;

  const state = createSeedBibleState({
    config,
    initialHref: `http://ssr.local${path}`,
  });

  const [appHtml] = await Promise.all([
    renderToStringAsync(
      <Main
        initialState={state}
        config={config}
        initialHref={`http://ssr.local${path}`}
      />
    ),
  ]);

  const metaHtml = await renderToStringAsync(
    <>
      <meta
        name="theme-color"
        content="#FFFFFF"
        media="(prefers-color-scheme: light)"
      />
      <meta
        name="theme-color"
        content="#000000"
        media="(prefers-color-scheme: dark)"
      />
      <meta name="description" content={state.app.description.value} />
      <title>{state.app.title.value}</title>
    </>
  );

  const configJson = escapeForScript(JSON.stringify(config));

  return options.html
    .replace("<!-- META -->", metaHtml) // No additional meta tags for now, but this allows it to be customized per request in the future if needed.
    .replace("<!-- CONFIG_JSON -->", configJson)
    .replace("<!-- APP_HTML -->", appHtml);
}
