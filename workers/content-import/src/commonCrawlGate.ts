import { INDEX_HOST } from "./commonCrawl/cdx";
import { defaultDeps, type WorkerDeps } from "./deps";

/** The least time between two requests to Common Crawl's index, across all owners. */
export const INDEX_REQUEST_GAP_MS = 1500;
/** How long to hold off after the index says it's overloaded, when it doesn't say. */
export const INDEX_BACKOFF_MS = 60 * 1000;
const USER_AGENT = "SeedBibleContentImport/1.0 (+https://seedbible.org)";

/**
 * The one lane to Common Crawl's index server, shared by every import (a
 * single Durable Object). The index is a free shared service that asks
 * heavy users to go slowly, so requests go out one at a time, spaced
 * {@link INDEX_REQUEST_GAP_MS} apart, and a 503 or 429 holds everyone off
 * for a while. It only remembers when it may send next; losing that to a
 * restart means at worst one request goes out a little early.
 *
 * Callers send `POST` with the index URL as the body. Anything that isn't
 * on the index host is refused, so the gate can't be used to reach other
 * addresses.
 */
export class CommonCrawlGate {
  private chain: Promise<unknown> = Promise.resolve();
  private nextAt = 0;
  private readonly deps: WorkerDeps;

  constructor(_state: unknown, _env: unknown, deps: WorkerDeps = defaultDeps) {
    this.deps = deps;
  }

  async fetch(request: Request): Promise<Response> {
    let target: URL;
    try {
      target = new URL((await request.text()).trim());
    } catch {
      return new Response("Not a URL.", { status: 400 });
    }
    if (target.protocol !== "https:" || target.hostname !== INDEX_HOST) {
      return new Response("Only Common Crawl's index is reachable.", {
        status: 400,
      });
    }
    const run = this.chain.then(() => this.send(target));
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async send(target: URL): Promise<Response> {
    const wait = this.nextAt - this.deps.now();
    if (wait > 0) {
      await this.deps.sleep(wait);
    }
    let response: Response;
    try {
      response = await this.deps.fetch(target.toString(), {
        headers: { "User-Agent": USER_AGENT },
      });
    } catch (error) {
      this.nextAt = this.deps.now() + INDEX_REQUEST_GAP_MS;
      return new Response(String(error), { status: 502 });
    }
    let gap = INDEX_REQUEST_GAP_MS;
    if (response.status === 503 || response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      gap =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10 * INDEX_BACKOFF_MS)
          : INDEX_BACKOFF_MS;
    }
    this.nextAt = this.deps.now() + gap;
    // Read here, so the next request waits for this one to finish arriving.
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "" },
    });
  }
}

/** Asks Common Crawl's index for `url` through the gate. */
export async function fetchThroughGate(
  gate: { fetch: (request: Request) => Promise<Response> },
  url: string
): Promise<Response> {
  return gate.fetch(
    new Request("https://common-crawl-gate/fetch", {
      method: "POST",
      body: url,
    })
  );
}
