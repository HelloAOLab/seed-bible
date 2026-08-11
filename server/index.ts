/**
 * SSR host server.
 *
 * Behaviour depends on `NODE_ENV`:
 *
 *  - production: a single long-running multi-branch host process. It serves
 *    every branch deployment from pre-built SSR bundles resolved via the
 *    artifact store:
 *      - GET /                            → the root branch (production `main`)
 *      - GET /b/<name>                    → 302 to /b/<name>/<latest buildId>
 *      - GET /b/<name>/<buildId>          → that branch's pinned build
 *      - GET /?pattern=<name>...          → 302 to ao.bot (legacy deep links)
 *      - GET /healthz                     → liveness probe
 *      - POST /__invalidate?branch=       → drop the cached pointer for a branch
 *    Per request it resolves the branch's live build. Only branches in the
 *    `ALLOWED_SSR_BRANCHES` whitelist are server-side rendered by their own
 *    bundle: for those, the SSR bundle is lazily loaded and cached, and its
 *    render() is called to produce HTML. Any other branch still works, but its
 *    (untrusted) SSR bundle is never downloaded or imported. Such a branch is
 *    either rendered through the trusted `DEFAULT_SSR_BRANCH`'s bundle (when
 *    set) over its own pre-rendered HTML, or served that HTML as-is. Hashed
 *    assets are never served from disk here. Each deployment's hashed chunks are
 *    namespaced per branch/build and referenced at the absolute asset host, so
 *    the client loads them straight from the CDN — they do not transit this
 *    server. The proxy below still backstops same-origin asset requests (e.g.
 *    the root-scoped PWA shell — `sw.js`, `registerSW.js`, the web manifest):
 *    such a request is reverse-proxied to the asset host (CDN/S3), streaming the
 *    upstream response straight back to the client.
 *
 *  - non-production: an Express + Vite dev server with HMR. The SSR entry is
 *    loaded fresh from source on every request via `vite.ssrLoadModule`, so no
 *    build step is required. None of the production host code runs in this mode.
 */
import {
  createServer,
  type IncomingMessage,
  type IncomingHttpHeaders,
  type Server,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";
import { pipeline, Readable } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { createGzip } from "node:zlib";
import { createStore, type ArtifactStore, type BranchPointer } from "./store";
import Bowser from "bowser";
import { parseAcceptLanguages } from "./lang.js";
import { SpanKind, type Span } from "@opentelemetry/api";
import {
  expressSpanMiddleware,
  extractContext,
  initTelemetry,
  instrumentStore,
  markRenderDegraded,
  recordAssetProxy,
  recordCacheLookup,
  recordError,
  recordHttpRequest,
  recordRender,
  requestSpanAttributes,
  routeLabel,
  setResponseStatus,
  setRouteAttributes,
  withSpan,
  type Telemetry,
} from "./telemetry";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 3002);
const ROOT_BRANCH = process.env.ROOT_BRANCH ?? "main";
const ASSET_HOST = process.env.ASSET_HOST ?? "";
const POINTER_TTL_MS = Number(process.env.POINTER_TTL_MS ?? 10_000);
const MODULE_CACHE_MAX = Number(process.env.MODULE_CACHE_MAX ?? 20);

const INVALIDATION_SECRET = process.env.INVALIDATION_SECRET ?? "";

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

export type RenderFn = (opts: {
  path: string;
  config: {
    basePath: string;
    assetHost: string;
    renderedAsMobile: boolean;
    acceptedLanguages: string[];
  };
  html: string;
}) => Promise<
  | { html: string; notFound?: true }
  | { redirectTo: string; redirectStatus?: number; vary?: string }
  | string
>;

/** Derives per-client render config (mobile, languages) from request headers. */
export function clientConfigFromHeaders(
  headers: IncomingHttpHeaders
): ClientConfig {
  const browser = Bowser.getParser(headers["user-agent"]!);
  const renderedAsMobile = browser.getPlatformType(true) === "mobile";
  const acceptedLanguages = headers["accept-language"]
    ? parseAcceptLanguages(headers["accept-language"])
    : [];
  return { renderedAsMobile, acceptedLanguages };
}

// ─── Gzip compression ────────────────────────────────────────────────────────

/** Below this size, gzip's overhead isn't worth the CPU cost. */
const GZIP_THRESHOLD_BYTES = 1024;

/** Content-Type prefixes worth gzipping; binary/already-compressed formats are excluded. */
const COMPRESSIBLE_CONTENT_TYPE_RE =
  /^(text\/|application\/(json|javascript|manifest\+json)|image\/svg)/i;

function acceptsGzip(headers: IncomingHttpHeaders): boolean {
  const acceptEncoding = headers["accept-encoding"];
  return typeof acceptEncoding === "string" && /\bgzip\b/i.test(acceptEncoding);
}

/**
 * Resolves once the response body has actually been flushed to the socket.
 *
 * Both the gzip path in `sendHtml` and the asset proxy stream their body with
 * `pipeline`, which returns before the transfer completes. Timing a request
 * without waiting for this would stop the clock too early and understate
 * latency on nearly every page. `close` is listened for as well as `finish` so
 * an aborted connection still settles this rather than leaking a span.
 */
function responseFinished(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const socket = res.socket;
  if (
    res.writableFinished ||
    res.closed ||
    res.destroyed ||
    socket?.destroyed === true
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = (): void => resolve();
    res.once("finish", done);
    res.once("close", done);
    // Bun is the reason for the next two. When a client disconnects mid-
    // transfer it emits nothing at all on the response — no "close", and
    // `res.closed`/`res.destroyed` stay false/undefined — while the request
    // aborts and the socket is destroyed. Waiting only on the response would
    // hang forever there, leaking the span and losing the request entirely.
    req.once("aborted", done);
    socket?.once("close", done);
  });
}

/** Logs a streaming response failure; `pipeline` has already torn down every stage. */
function logStreamFailure(
  context: string,
  err: NodeJS.ErrnoException | null
): void {
  if (err && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
    console.error(`${context}:`, err);
  }
}

/**
 * Writes an HTML response, gzip-compressing it when the client supports it
 * and the body is large enough for compression to be worthwhile. Compression
 * is streamed through a Transform rather than buffered in full, so only one
 * chunk's worth of compressed output is held at a time.
 */
function sendHtml(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  html: string,
  extraHeaders: Record<string, string> = {}
): void {
  const body = Buffer.from(html, "utf8");
  const headers: Record<string, string> = {
    ...extraHeaders,
    "content-type": "text/html; charset=utf-8",
    vary: "accept-encoding",
  };

  if (body.length >= GZIP_THRESHOLD_BYTES && acceptsGzip(req.headers)) {
    headers["content-encoding"] = "gzip";
    res.writeHead(statusCode, headers);
    pipeline(Readable.from(body), createGzip(), res, (err) =>
      logStreamFailure("gzip HTML response failed", err)
    );
    return;
  }

  res.writeHead(statusCode, headers);
  res.end(body);
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
  if (cached && cached.expires > now) {
    recordCacheLookup("pointer", true);
    return cached.pointer;
  }
  recordCacheLookup("pointer", false);
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
    recordCacheLookup("module", true);
    return existing;
  }
  recordCacheLookup("module", false);

  const { serverModulePath, html } = await store.fetchArtifacts(
    branch,
    buildId
  );
  // Evaluating a branch's SSR bundle is a cold-start cliff — the first request
  // for a build pays for it while later ones hit the cache above. Give it its
  // own span so those outlier latencies are explainable.
  const mod = await withSpan(
    "build.import",
    {
      attributes: { "seedbible.branch": branch, "seedbible.build_id": buildId },
    },
    () => import(pathToFileURL(serverModulePath).href)
  );
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
    recordCacheLookup("html", true);
    return existing;
  }
  recordCacheLookup("html", false);

  const html = await store.fetchHtml(branch, buildId);
  htmlCache.set(key, html);
  while (htmlCache.size > MODULE_CACHE_MAX) {
    const oldest = htmlCache.keys().next().value as string;
    htmlCache.delete(oldest);
  }
  return html;
}

// ─── Routing ─────────────────────────────────────────────────────────────────
export interface Route {
  branch: string;
  /** Path prefix this deployment is mounted under (no trailing slash). */
  basePath: string;
  /** Full request path + query passed to the app (includes the deployment prefix). */
  appUrl: string;
  /** If present, skip pointer lookup and load this build directly. */
  patternVersion?: string;
}

/**
 * Maps a request URL to a branch deployment. Branch deployments are mounted
 * under a `/b/<branch>` path prefix, optionally pinned to a build via
 * `/b/<branch>/<buildId>`; everything else resolves to the root branch.
 */
function resolveRoute(rawUrl: string): Route {
  const parsed = new URL(rawUrl, "http://localhost");
  const appUrl = `${parsed.pathname}${parsed.search}`;
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments[0] === "b" && segments.length >= 2) {
    const branchSeg = segments[1]!;
    const versionSeg = segments[2];
    const patternVersion = versionSeg
      ? decodeURIComponent(versionSeg)
      : undefined;
    const basePath = versionSeg
      ? `/b/${branchSeg}/${versionSeg}`
      : `/b/${branchSeg}`;

    return {
      branch: decodeURIComponent(branchSeg),
      basePath,
      appUrl,
      patternVersion,
    };
  }

  return {
    branch: ROOT_BRANCH,
    basePath: "",
    appUrl,
    patternVersion: undefined,
  };
}

/**
 * Runs an SSR render() over the given pre-rendered HTML and writes the
 * result. If render() throws, the error is logged and the unrendered
 * `preRenderedHtml` is served as-is instead of failing the request — the
 * client still gets a working page (just without server-rendered content).
 */
export async function renderAndRespond(
  req: IncomingMessage,
  res: ServerResponse,
  render: RenderFn,
  route: Route,
  preRenderedHtml: string
): Promise<void> {
  const { renderedAsMobile, acceptedLanguages } = clientConfigFromHeaders(
    req.headers
  );

  let result: Awaited<ReturnType<RenderFn>>;
  const renderStart = performance.now();
  let renderFailed = false;
  try {
    result = await withSpan(
      "ssr.render",
      {
        attributes: {
          "seedbible.branch": route.branch,
          "seedbible.rendered_as_mobile": renderedAsMobile,
        },
      },
      () =>
        render({
          path: route.appUrl,
          config: {
            basePath: route.basePath,
            assetHost: ASSET_HOST,
            renderedAsMobile,
            acceptedLanguages,
          },
          html: preRenderedHtml,
        })
    );
  } catch (err) {
    renderFailed = true;
    console.error(
      `SSR render() failed for branch "${route.branch}" (${route.appUrl}); falling back to unrendered HTML:`,
      err
    );
    // This path answers 200 with a page that has no server-rendered content, so
    // from the outside the site looks healthy. Flag it on the request span and
    // count it — otherwise the degradation is invisible.
    markRenderDegraded();
    result = { html: preRenderedHtml };
  } finally {
    recordRender(renderStart, route.branch, renderFailed);
  }

  if (typeof result === "object" && result !== null && "redirectTo" in result) {
    res.writeHead(result.redirectStatus ?? 301, {
      location: result.redirectTo,
      ...(result.vary ? { vary: result.vary } : {}),
    });
    res.end();
    return;
  }

  const notFound =
    typeof result === "object" &&
    result !== null &&
    "notFound" in result &&
    result.notFound;
  const html = typeof result === "string" ? result : result.html;

  // The HTML is per-build and cheap to regenerate; let the CDN cache it
  // briefly but always revalidate so a pointer flip is picked up fast.
  sendHtml(req, res, notFound ? 404 : 200, html, {
    "cache-control": "public, max-age=0, must-revalidate",
  });
}

/**
 * Hashed-asset path extensions. A request whose path ends in one of these is
 * reverse-proxied to the asset host rather than treated as an app route.
 */
const ASSET_PATH_RE =
  /\.(js|mjs|cjs|css|map|json|wasm|woff2?|ttf|otf|eot|ico|png|jpe?g|gif|svg|webp|avif|txt|xml|webmanifest)$/i;

/** Request headers worth forwarding upstream (conditional + content negotiation). */
const FORWARDED_ASSET_HEADERS = [
  "accept",
  "accept-encoding",
  "if-none-match",
  "if-modified-since",
  "range",
  "user-agent",
];

/**
 * Reverse-proxies an asset request to `ASSET_HOST`, streaming the upstream
 * response back. Conditional/range headers are passed through so the origin can
 * answer 304/206. Body-framing headers from upstream are dropped because the
 * fetch client may have transparently decompressed the body — Node sets the
 * correct framing for what we actually write.
 */
async function proxyAsset(
  req: IncomingMessage,
  res: ServerResponse,
  pathAndQuery: string
): Promise<void> {
  const forwardHeaders: Record<string, string> = {};
  for (const name of FORWARDED_ASSET_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") forwardHeaders[name] = value;
  }

  const upstreamUrl = `${ASSET_HOST}${pathAndQuery}`;
  const proxyStart = performance.now();

  // The span stays open across the whole exchange — upstream fetch *and* body
  // transfer. Ending it once the headers arrived would report every asset as
  // instant no matter how large the file or how slow the client, and would let
  // a mid-stream failure land after the span had already closed.
  await withSpan(
    "asset.proxy",
    { kind: SpanKind.CLIENT, attributes: { "url.full": upstreamUrl } },
    async (span) => {
      let upstream: Response;
      try {
        upstream = await fetch(upstreamUrl, {
          method: "GET",
          headers: forwardHeaders,
          redirect: "manual",
        });
      } catch (err) {
        console.error(`Asset proxy failed for ${pathAndQuery}:`, err);
        recordError(span, err);
        recordAssetProxy(proxyStart, 502);
        res.writeHead(502, { "content-type": "text/plain" });
        res.end("Bad gateway");
        return;
      }
      span.setAttribute("http.response.status_code", upstream.status);

      const headers: Record<string, string> = {};
      upstream.headers.forEach((value, key) => {
        switch (key.toLowerCase()) {
          case "content-encoding":
          case "content-length":
          case "transfer-encoding":
          case "connection":
            return;
          default:
            headers[key] = value;
        }
      });

      // Only gzip a full 200 response — a 206 (range) or 304 (not modified) has
      // no body worth compressing, and re-encoding a byte range would corrupt
      // it. This also assumes `fetch` has fully decoded any upstream
      // content-coding (it does, transparently) — if the asset host ever served
      // a coding undici leaves encoded, this would gzip an already-encoded body
      // and corrupt it.
      const shouldGzip =
        upstream.status === 200 &&
        !!upstream.body &&
        COMPRESSIBLE_CONTENT_TYPE_RE.test(headers["content-type"] ?? "") &&
        acceptsGzip(req.headers);
      if (shouldGzip) headers["content-encoding"] = "gzip";
      headers["vary"] = "accept-encoding";

      res.writeHead(upstream.status, headers);
      if (!upstream.body) {
        res.end();
        recordAssetProxy(proxyStart, upstream.status);
        return;
      }

      const upstreamBody = Readable.fromWeb(
        upstream.body as NodeReadableStream<Uint8Array>
      );
      // Listeners are attached before streaming starts, so a disconnect that
      // happens immediately is not missed.
      const disconnected = responseFinished(req, res);
      const streaming = shouldGzip
        ? streamPipeline(upstreamBody, createGzip(), res)
        : streamPipeline(upstreamBody, res);
      // Under Bun this promise never settles when the client goes away, hence
      // the race below. Marking it handled here keeps a late rejection from
      // surfacing as an unhandled one; `race` still sees the original.
      void streaming.catch(() => {});
      try {
        await Promise.race([streaming, disconnected]);
      } catch (err) {
        const streamErr = err as NodeJS.ErrnoException;
        logStreamFailure(
          `Asset proxy${shouldGzip ? " gzip" : ""} failed for ${pathAndQuery}`,
          streamErr
        );
        // A client that navigates away mid-download aborts the stream. That is
        // normal browser behaviour, not a server fault, so it should not mark
        // the span as an error.
        if (streamErr.code !== "ERR_STREAM_PREMATURE_CLOSE") {
          recordError(span, err);
        }
      } finally {
        recordAssetProxy(proxyStart, upstream.status);
      }
    }
  );
}

/**
 * Entry point for every request. Opens the server span, then delegates to
 * `dispatch` for the actual routing.
 */
async function handle(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url ?? "/";

  // Answered before any span is opened: liveness probes fire every few seconds
  // and carry no information, so tracing them would drown out real traffic and
  // skew the latency histogram.
  if (url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  const parsedUrl = new URL(url, "http://localhost");
  const isAssetRequest =
    Boolean(ASSET_HOST) && ASSET_PATH_RE.test(parsedUrl.pathname);
  const method = req.method ?? "GET";
  // A bounded label — the raw path contains branch names and build ids, which
  // would be unbounded cardinality as a metric attribute.
  const routeName = isAssetRequest
    ? "asset-proxy"
    : routeLabel(parsedUrl.pathname);
  // Resolved once here and handed to dispatch, which needs the same value for
  // actual routing — deriving it twice risks the two copies drifting apart.
  const route = resolveRoute(url);
  const metricBranch =
    isAssetRequest || routeName === "/__invalidate" ? "" : route.branch;
  const start = performance.now();

  await withSpan(
    `${method} ${routeName}`,
    {
      kind: SpanKind.SERVER,
      // Continue an upstream trace (CDN, load balancer) when one is present.
      parent: extractContext(req.headers),
      attributes: requestSpanAttributes({
        method,
        pathname: parsedUrl.pathname,
        route: routeName,
        httpVersion: req.httpVersion,
        host:
          typeof req.headers.host === "string" ? req.headers.host : undefined,
        clientAddress: req.socket.remoteAddress ?? undefined,
        userAgent:
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : undefined,
      }),
    },
    async (span) => {
      try {
        await dispatch(req, res, url, parsedUrl, route, isAssetRequest, span);
        // Gzipped and proxied responses stream after dispatch returns; wait for
        // the body to be flushed so the recorded duration covers it.
        await responseFinished(req, res);
      } finally {
        setResponseStatus(span, res.statusCode);
        recordHttpRequest(start, {
          method,
          statusCode: res.statusCode,
          route: routeName,
          branch: metricBranch,
        });
      }
    }
  );
}

async function dispatch(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  parsedUrl: URL,
  route: Route,
  isAssetRequest: boolean,
  span: Span
): Promise<void> {
  // Legacy CasualOS deep links used a `?pattern=` query param. Redirect those
  // to the ao.bot host, preserving the full query string.
  if (parsedUrl.searchParams.has("pattern")) {
    res.writeHead(302, { location: `https://ao.bot/${parsedUrl.search}` });
    res.end();
    return;
  }

  if (url.startsWith("/__invalidate")) {
    if (
      INVALIDATION_SECRET &&
      req.headers["x-invalidation-secret"] !== INVALIDATION_SECRET
    ) {
      res.writeHead(403, { "content-type": "text/plain" });
      res.end("Forbidden");
      return;
    }

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

  // Reverse-proxy same-origin asset requests to the asset host. Versioned
  // hashed chunks load directly from the CDN and never reach here; this path
  // backstops root-scoped same-origin files like the PWA shell (sw.js,
  // registerSW.js, the web manifest). Without an asset host configured there is
  // nowhere to forward them, so let them fall through to the app router (and 404).
  if (isAssetRequest) {
    await proxyAsset(req, res, `${parsedUrl.pathname}${parsedUrl.search}`);
    return;
  }

  const ssrAllowed = ALLOWED_SSR_BRANCHES.has(route.branch);

  try {
    const pointer = route.patternVersion
      ? { buildId: route.patternVersion }
      : await resolvePointer(route.branch);
    // Spans are not aggregated, so the real branch name is safe to record here
    // even though the metric attribute has to be clamped.
    setRouteAttributes(span, route.branch, pointer?.buildId, ssrAllowed);
    if (!pointer) {
      sendHtml(
        req,
        res,
        404,
        `<!doctype html><meta charset=utf-8><h1>404</h1><p>No deployment for branch <code>${route.branch}</code>.</p>`
      );
      return;
    }

    // A `/b/<branch>` request (no pinned version) redirects to the resolved
    // latest build so the client lands on a stable, version-pinned URL. The
    // root branch keeps its bare path and is never redirected.
    if (!route.patternVersion && route.basePath) {
      res.writeHead(302, {
        location: `${route.basePath}/${pointer.buildId}${parsedUrl.search}`,
      });
      res.end();
      return;
    }

    // Whitelisted branches are rendered by their own SSR bundle.
    if (ssrAllowed) {
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
    sendHtml(req, res, 200, preRenderedHtml, {
      "cache-control": "public, max-age=0, must-revalidate",
    });
  } catch (err) {
    console.error(`Render failed for ${route.branch} (${url}):`, err);
    // Swallowed here so the client still gets a page; record it on the span so
    // it is not swallowed from the trace too.
    recordError(span, err);
    sendHtml(
      req,
      res,
      500,
      "<!doctype html><meta charset=utf-8><h1>500</h1><p>Render error.</p>"
    );
  }
}

/** How long to wait for in-flight requests before flushing telemetry and exiting. */
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS ?? 5_000);

/**
 * Closes the server on SIGTERM/SIGINT and flushes buffered spans and metrics
 * before exiting. Without this, the last batch is lost on every deploy — which
 * is exactly the batch covering whatever prompted the deploy.
 */
function installShutdownHandlers(server: Server, telemetry: Telemetry): void {
  let finished = false;
  const finish = async (): Promise<void> => {
    if (finished) return;
    finished = true;
    await telemetry.shutdown();
    process.exit(0);
  };

  const stop = (signal: NodeJS.Signals): void => {
    console.log(`Received ${signal}; shutting down.`);
    server.close(() => void finish());
    // A hung keep-alive connection must not block the flush indefinitely.
    setTimeout(() => void finish(), SHUTDOWN_GRACE_MS).unref();
  };

  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

function startProdServer(): void {
  const storeBackend = process.env.STORE_BACKEND ?? "local";
  const telemetry = initTelemetry({
    allowedBranches: ALLOWED_SSR_BRANCHES,
    rootBranch: ROOT_BRANCH,
  });
  store = instrumentStore(createStore(), storeBackend);

  const server = createServer((req, res) => {
    void handle(req, res);
  }).listen(PORT, () => {
    console.log(
      `Seed Bible host server listening on :${PORT} (root branch: ${ROOT_BRANCH}, store: ${storeBackend}, SSR branches: ${[...ALLOWED_SSR_BRANCHES].join(", ") || "(none)"}, default SSR branch: ${DEFAULT_SSR_BRANCH || "(none)"}, telemetry: ${telemetry.enabled ? "on" : "off"})`
    );
  });

  installShutdownHandlers(server, telemetry);
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

  const telemetry = initTelemetry({
    allowedBranches: ALLOWED_SSR_BRANCHES,
    rootBranch: ROOT_BRANCH,
  });

  // Registered ahead of Vite's middleware so it wraps the whole chain. No-op
  // unless an OTLP endpoint is configured.
  app.use(expressSpanMiddleware(ROOT_BRANCH));

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

    // 1. Read index.html. A failure here means there's nothing to fall back
    //    to, so it's a genuine error.
    let template: string;
    try {
      template = fs.readFileSync(
        path.resolve(import.meta.dirname, "..", "index.html"),
        "utf-8"
      );
    } catch (e) {
      console.error(e);
      next(e);
      return;
    }

    try {
      // 2. Apply Vite HTML transforms (injects the HMR client + plugin
      //    preambles).
      const transformed = await vite.transformIndexHtml(
        "/index.html",
        template,
        req.originalUrl
      );

      // 3. Load the server entry. ssrLoadModule transforms ESM source to be
      //    usable in Node.js with efficient HMR-style invalidation.
      const { render } = (await vite.ssrLoadModule(
        "/standalone/entry-ssr.tsx"
      )) as { render: RenderFn };

      const { renderedAsMobile, acceptedLanguages } = clientConfigFromHeaders(
        req.headers
      );

      // 4. Render the app HTML.
      const renderStart = performance.now();
      let result: Awaited<ReturnType<RenderFn>>;
      try {
        result = await withSpan(
          "ssr.render",
          {
            attributes: {
              "seedbible.branch": ROOT_BRANCH,
              "seedbible.rendered_as_mobile": renderedAsMobile,
            },
          },
          () =>
            render({
              path: req.originalUrl,
              config: {
                basePath: "",
                assetHost: "",
                renderedAsMobile,
                acceptedLanguages,
              },
              html: transformed,
            })
        );
      } catch (e) {
        recordRender(renderStart, ROOT_BRANCH, true);
        throw e;
      }
      recordRender(renderStart, ROOT_BRANCH, false);

      // 5. Send the rendered HTML back (or redirect, for legacy query-param
      // URLs being migrated to path-based routes, or a 404 for an
      // unrecognized book that couldn't be corrected).
      if (typeof result === "object" && result && "redirectTo" in result) {
        if (result.vary) {
          res.set("Vary", result.vary);
        }
        res.redirect(result.redirectStatus ?? 301, result.redirectTo);
        return;
      }

      const notFound =
        typeof result === "object" &&
        result !== null &&
        "notFound" in result &&
        result.notFound;
      const html = typeof result === "string" ? result : result.html;

      // 5. Send the rendered HTML back.
      sendHtml(req, res, notFound ? 404 : 200, html);
    } catch (e) {
      if (e instanceof Error) {
        // Let Vite fix the stack trace so it maps back to the actual source.
        vite.ssrFixStacktrace(e);
      }
      console.error(
        `SSR render failed for ${req.originalUrl}; falling back to unrendered index.html:`,
        e
      );
      markRenderDegraded();
      // Serve the unrendered index.html rather than failing the request.
      sendHtml(req, res, 200, template);
    }
  });

  const server = app.listen(PORT, () => {
    console.log(
      `Seed Bible dev server running at http://localhost:${PORT} (telemetry: ${telemetry.enabled ? "on" : "off"})`
    );
  });

  installShutdownHandlers(server, telemetry);
}

// Vitest sets this in every worker process — skipped there so importing this
// module for its exported helpers doesn't also bind a real port.
if (process.env.VITEST !== "true") {
  if (IS_PRODUCTION) {
    startProdServer();
  } else {
    void startDevServer();
  }
}
