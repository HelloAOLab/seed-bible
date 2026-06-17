/**
 * SSR host server.
 *
 * Behaviour depends on `NODE_ENV`:
 *
 *  - production: a single long-running multi-branch host process. It serves
 *    every branch deployment from pre-built SSR bundles resolved via the
 *    artifact store:
 *      - GET /                            → the root branch (production `main`)
 *      - GET /?pattern=<name>             → that branch's deployment
 *      - GET /?pattern=<name>&patternVersion=<buildId>  → pinned build
 *      - GET /healthz                     → liveness probe
 *      - POST /__invalidate?branch=       → drop the cached pointer for a branch
 *    Per request it resolves the branch's live build. Only branches in the
 *    `ALLOWED_SSR_BRANCHES` whitelist are server-side rendered by their own
 *    bundle: for those, the SSR bundle is lazily loaded and cached, and its
 *    render() is called to produce HTML. Any other branch still works, but its
 *    (untrusted) SSR bundle is never downloaded or imported. Such a branch is
 *    either rendered through the trusted `DEFAULT_SSR_BRANCH`'s bundle (when
 *    set) over its own pre-rendered HTML, or served that HTML as-is. Hashed
 *    assets are never served here — the rendered HTML references them at the
 *    absolute asset host (CDN/S3).
 *
 *  - non-production: an Express + Vite dev server with HMR. The SSR entry is
 *    loaded fresh from source on every request via `vite.ssrLoadModule`, so no
 *    build step is required. None of the production host code runs in this mode.
 */
import {
  createServer,
  type IncomingMessage,
  type IncomingHttpHeaders,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";
import { createStore, type ArtifactStore, type BranchPointer } from "./store";
import Bowser from "bowser";
import { parseAcceptLanguages } from "./lang.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 3002);
const ROOT_BRANCH = process.env.ROOT_BRANCH ?? "main";
const ASSET_HOST = process.env.ASSET_HOST ?? "";
const POINTER_TTL_MS = Number(process.env.POINTER_TTL_MS ?? 10_000);
const MODULE_CACHE_MAX = Number(process.env.MODULE_CACHE_MAX ?? 20);

/**
 * Comma-separated whitelist of branches that are server-side rendered by their
 * own SSR bundle. A branch outside this set never has its (untrusted) bundle
 * downloaded or imported; it is instead either rendered via `DEFAULT_SSR_BRANCH`
 * (if set) or served its pre-rendered HTML as-is.
 */
const ALLOWED_SSR_BRANCHES = new Set(
  (process.env.ALLOWED_SSR_BRANCHES ?? ROOT_BRANCH)
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean)
);

/**
 * Optional trusted branch whose SSR bundle renders any non-whitelisted branch.
 * When set, a non-whitelisted branch's pre-rendered HTML is rendered through
 * this branch's render() — the requested branch's own bundle is still never
 * imported. When empty, non-whitelisted branches are served their HTML as-is.
 */
const DEFAULT_SSR_BRANCH = (process.env.DEFAULT_SSR_BRANCH ?? "").trim();

interface ClientConfig {
  renderedAsMobile: boolean;
  acceptedLanguages: string[];
}

type RenderFn = (opts: {
  path: string;
  config: {
    basePath: string;
    assetHost: string;
    renderedAsMobile: boolean;
    acceptedLanguages: string[];
  };
  html: string;
}) => Promise<string>;

/** Derives per-client render config (mobile, languages) from request headers. */
function clientConfigFromHeaders(headers: IncomingHttpHeaders): ClientConfig {
  const browser = Bowser.getParser(headers["user-agent"]!);
  const renderedAsMobile = browser.getPlatformType(true) === "mobile";
  const acceptedLanguages = headers["accept-language"]
    ? parseAcceptLanguages(headers["accept-language"])
    : [];
  return { renderedAsMobile, acceptedLanguages };
}

// ─── Production: multi-branch host ───────────────────────────────────────────

// Instantiated by startProdServer(); never created in dev mode.
let store!: ArtifactStore;

// ─── Pointer cache (branch → live buildId), short TTL ────────────────────────
interface PointerEntry {
  pointer: BranchPointer | null;
  expires: number;
}
const pointerCache = new Map<string, PointerEntry>();

async function resolvePointer(branch: string): Promise<BranchPointer | null> {
  const cached = pointerCache.get(branch);
  const now = Date.now();
  if (cached && cached.expires > now) return cached.pointer;
  const pointer = await store.readPointer(branch);
  pointerCache.set(branch, { pointer, expires: now + POINTER_TTL_MS });
  return pointer;
}

// ─── Module cache (buildId → loaded render fn + manifest), LRU ───────────────
interface ModuleEntry {
  render: RenderFn;
  html: string;
}
const moduleCache = new Map<string, ModuleEntry>(); // insertion-ordered → LRU

async function loadBuild(
  branch: string,
  buildId: string
): Promise<ModuleEntry> {
  const key = `${branch}@${buildId}`;
  const existing = moduleCache.get(key);
  if (existing) {
    // Refresh LRU recency.
    moduleCache.delete(key);
    moduleCache.set(key, existing);
    return existing;
  }

  const { serverModulePath, html } = await store.fetchArtifacts(
    branch,
    buildId
  );
  const mod = await import(pathToFileURL(serverModulePath).href);
  const render = mod.render as RenderFn;
  if (typeof render !== "function") {
    throw new Error(`Build ${key} does not export render()`);
  }

  const entry: ModuleEntry = { render, html };
  moduleCache.set(key, entry);
  while (moduleCache.size > MODULE_CACHE_MAX) {
    const oldest = moduleCache.keys().next().value as string;
    moduleCache.delete(oldest);
  }
  return entry;
}

// ─── HTML cache (buildId → pre-rendered html), LRU ───────────────────────────
// Used for non-SSR branches: their pre-rendered HTML is served as-is, so the
// SSR bundle is never fetched or imported.
const htmlCache = new Map<string, string>(); // insertion-ordered → LRU

async function loadHtml(branch: string, buildId: string): Promise<string> {
  const key = `${branch}@${buildId}`;
  const existing = htmlCache.get(key);
  if (existing !== undefined) {
    // Refresh LRU recency.
    htmlCache.delete(key);
    htmlCache.set(key, existing);
    return existing;
  }

  const html = await store.fetchHtml(branch, buildId);
  htmlCache.set(key, html);
  while (htmlCache.size > MODULE_CACHE_MAX) {
    const oldest = htmlCache.keys().next().value as string;
    htmlCache.delete(oldest);
  }
  return html;
}

// ─── Routing ─────────────────────────────────────────────────────────────────
interface Route {
  branch: string;
  /** Path prefix this deployment is mounted under (no trailing slash). */
  basePath: string;
  /** Path + query passed to the app (starts with "/", excludes pattern params). */
  appUrl: string;
  /** If present, skip pointer lookup and load this build directly. */
  patternVersion?: string;
}

function resolveRoute(rawUrl: string): Route {
  const parsed = new URL(rawUrl, "http://localhost");
  const pattern = parsed.searchParams.get("pattern");
  const patternVersion = parsed.searchParams.get("patternVersion") ?? undefined;

  const appParams = new URLSearchParams(parsed.searchParams);
  appParams.delete("pattern");
  appParams.delete("patternVersion");
  const qs = appParams.size > 0 ? `?${appParams}` : "";
  const appUrl = `${parsed.pathname}${qs}`;

  return {
    branch: pattern ?? ROOT_BRANCH,
    basePath: "",
    appUrl,
    patternVersion,
  };
}

/** Runs an SSR render() over the given pre-rendered HTML and writes the result. */
async function renderAndRespond(
  req: IncomingMessage,
  res: ServerResponse,
  render: RenderFn,
  route: Route,
  preRenderedHtml: string
): Promise<void> {
  const { renderedAsMobile, acceptedLanguages } = clientConfigFromHeaders(
    req.headers
  );

  const html = await render({
    path: route.appUrl,
    config: {
      basePath: route.basePath,
      assetHost: ASSET_HOST,
      renderedAsMobile,
      acceptedLanguages,
    },
    html: preRenderedHtml,
  });

  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    // The HTML is per-build and cheap to regenerate; let the CDN cache it
    // briefly but always revalidate so a pointer flip is picked up fast.
    "cache-control": "public, max-age=0, must-revalidate",
  });
  res.end(html);
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url ?? "/";

  if (url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (url.startsWith("/__invalidate")) {
    const branch = new URL(url, "http://localhost").searchParams.get("branch");
    if (branch) {
      pointerCache.delete(branch);
      for (const key of [...moduleCache.keys()]) {
        if (key.startsWith(`${branch}@`)) moduleCache.delete(key);
      }
      for (const key of [...htmlCache.keys()]) {
        if (key.startsWith(`${branch}@`)) htmlCache.delete(key);
      }
    } else {
      pointerCache.clear();
    }
    res.writeHead(204);
    res.end();
    return;
  }

  const route = resolveRoute(url);

  try {
    const pointer = route.patternVersion
      ? { buildId: route.patternVersion }
      : await resolvePointer(route.branch);
    if (!pointer) {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(
        `<!doctype html><meta charset=utf-8><h1>404</h1><p>No deployment for branch <code>${route.branch}</code>.</p>`
      );
      return;
    }

    // Whitelisted branches are rendered by their own SSR bundle.
    if (ALLOWED_SSR_BRANCHES.has(route.branch)) {
      const { render, html: preRenderedHtml } = await loadBuild(
        route.branch,
        pointer.buildId
      );
      await renderAndRespond(req, res, render, route, preRenderedHtml);
      return;
    }

    // Non-whitelisted branch: its own SSR bundle is never downloaded or
    // imported. Fetch only its pre-rendered HTML.
    const preRenderedHtml = await loadHtml(route.branch, pointer.buildId);

    // If a trusted default branch is configured, render this branch's HTML
    // through that branch's SSR bundle. Only the default branch's build code
    // runs — never the requested branch's.
    if (DEFAULT_SSR_BRANCH) {
      const defaultPointer = await resolvePointer(DEFAULT_SSR_BRANCH);
      if (defaultPointer) {
        const { render } = await loadBuild(
          DEFAULT_SSR_BRANCH,
          defaultPointer.buildId
        );
        await renderAndRespond(req, res, render, route, preRenderedHtml);
        return;
      }
      console.warn(
        `DEFAULT_SSR_BRANCH "${DEFAULT_SSR_BRANCH}" has no deployment; serving ${route.branch} HTML as-is.`
      );
    }

    // No SSR for this branch — serve the pre-rendered HTML verbatim.
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    });
    res.end(preRenderedHtml);
  } catch (err) {
    console.error(`Render failed for ${route.branch} (${url}):`, err);
    res.writeHead(500, { "content-type": "text/html" });
    res.end(
      "<!doctype html><meta charset=utf-8><h1>500</h1><p>Render error.</p>"
    );
  }
}

function startProdServer(): void {
  store = createStore();
  createServer((req, res) => {
    void handle(req, res);
  }).listen(PORT, () => {
    console.log(
      `Seed Bible host server listening on :${PORT} (root branch: ${ROOT_BRANCH}, store: ${process.env.STORE_BACKEND ?? "local"}, SSR branches: ${[...ALLOWED_SSR_BRANCHES].join(", ") || "(none)"}, default SSR branch: ${DEFAULT_SSR_BRANCH || "(none)"})`
    );
  });
}

// ─── Development: Express + Vite dev server ──────────────────────────────────

/**
 * Express + Vite middleware-mode dev server. The SSR entry is transformed and
 * loaded from source on each request (HMR-friendly), so there is no build step.
 *
 * `express` and `vite` are imported dynamically so they are only loaded — and
 * only need to be installed — when running outside production.
 */
async function startDevServer(): Promise<void> {
  const { default: express } = await import("express");
  const { createServer: createViteServer } = await import("vite");
  const fs = await import("node:fs");
  const path = await import("node:path");

  const app = express();

  // Create Vite server in middleware mode and configure the app type as
  // 'custom', disabling Vite's own HTML serving logic so the parent server
  // can take control.
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  // Use vite's connect instance as middleware. When the server restarts (for
  // example after the user modifies vite.config.js), `vite.middlewares` is
  // still the same reference, so this remains valid even after restarts.
  app.use(vite.middlewares);

  app.use("*all", async (req, res, next) => {
    const url = new URL(
      req.originalUrl,
      `${req.protocol}://${req.headers.host}`
    );
    if (/\.(js|css|map|json|xml|ico)$/.test(url.pathname)) {
      res.writeHead(404);
      res.end();
      return;
    }

    try {
      // 1. Read index.html.
      let template = fs.readFileSync(
        path.resolve(import.meta.dirname, "..", "index.html"),
        "utf-8"
      );

      // 2. Apply Vite HTML transforms (injects the HMR client + plugin
      //    preambles).
      template = await vite.transformIndexHtml(req.originalUrl, template);

      // 3. Load the server entry. ssrLoadModule transforms ESM source to be
      //    usable in Node.js with efficient HMR-style invalidation.
      const { render } = (await vite.ssrLoadModule(
        "/standalone/entry-ssr.tsx"
      )) as { render: RenderFn };

      const { renderedAsMobile, acceptedLanguages } = clientConfigFromHeaders(
        req.headers
      );

      // 4. Render the app HTML.
      const html = await render({
        path: req.originalUrl,
        config: {
          basePath: "",
          assetHost: "",
          renderedAsMobile,
          acceptedLanguages,
        },
        html: template,
      });

      // 5. Send the rendered HTML back.
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        // Let Vite fix the stack trace so it maps back to the actual source.
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });

  app.listen(PORT, () => {
    console.log(`Seed Bible dev server running at http://localhost:${PORT}`);
  });
}

if (IS_PRODUCTION) {
  startProdServer();
} else {
  void startDevServer();
}
