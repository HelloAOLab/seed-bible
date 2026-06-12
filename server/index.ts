/**
 * Multi-branch SSR host server.
 *
 * A single long-running process serves every branch deployment:
 *   - GET /                            → the root branch (production `main`)
 *   - GET /?pattern=<name>             → that branch's deployment
 *   - GET /?pattern=<name>&patternVersion=<buildId>  → pinned build
 *   - GET /healthz                     → liveness probe
 *   - POST /__invalidate?branch=       → drop the cached pointer for a branch
 *
 * Per request it resolves the branch's live build (via the artifact store),
 * lazily loads and caches that build's SSR bundle, and calls its render()
 * to produce HTML. Hashed assets are never served here — the rendered HTML
 * references them at the absolute asset host (CDN/S3).
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";
import {
  createStore,
  type ArtifactStore,
  type BranchPointer,
} from "./store.ts";
import Bowser from "bowser";

const PORT = Number(process.env.PORT ?? 8080);
const ROOT_BRANCH = process.env.ROOT_BRANCH ?? "main";
const ASSET_HOST = process.env.ASSET_HOST ?? "";
const POINTER_TTL_MS = Number(process.env.POINTER_TTL_MS ?? 10_000);
const MODULE_CACHE_MAX = Number(process.env.MODULE_CACHE_MAX ?? 20);

type RenderFn = (opts: {
  url: string;
  config: { basePath: string; assetHost: string; renderedAsMobile: boolean };
  html: string;
}) => Promise<string>;

const store: ArtifactStore = createStore();

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

    const { render, html: preRenderedHtml } = await loadBuild(
      route.branch,
      pointer.buildId
    );

    const browser = Bowser.getParser(req.headers["user-agent"]!);

    const isMobile = browser.getPlatformType(true) === "mobile";

    const html = await render({
      url: route.appUrl,
      config: {
        basePath: route.basePath,
        assetHost: ASSET_HOST,
        renderedAsMobile: isMobile,
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
  } catch (err) {
    console.error(`Render failed for ${route.branch} (${url}):`, err);
    res.writeHead(500, { "content-type": "text/html" });
    res.end(
      "<!doctype html><meta charset=utf-8><h1>500</h1><p>Render error.</p>"
    );
  }
}

createServer((req, res) => {
  void handle(req, res);
}).listen(PORT, () => {
  console.log(
    `Seed Bible host server listening on :${PORT} (root branch: ${ROOT_BRANCH}, store: ${process.env.STORE_BACKEND ?? "local"})`
  );
});
