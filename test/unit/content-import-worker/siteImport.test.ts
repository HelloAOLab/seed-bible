// @vitest-environment node
import { handleRequest } from "../../../workers/content-import/src/api";
import { runCleanup } from "../../../workers/content-import/src/cleanup";
import { clearCrawlCache } from "../../../workers/content-import/src/siteImports";
import {
  CONTENT_ITEM_MARKER,
  CONTENT_LIBRARY_MARKER,
  CONTENT_MANIFEST_ADDRESS,
  type ContentItem,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import {
  MAX_SITE_PAGES,
  type ImportProgress,
  type SiteImport,
} from "@packages/seed-bible/seed-bible/managers/customContent/importApi";
import {
  APP_ORIGIN,
  createFakeCasualOS,
  createFakeCommonCrawl,
  createTestWorker,
  type FakeCasualOS,
  type TestWorker,
} from "./harness";

const OWNER = "owner-1";
const LIBRARY = "seedbible-content-test";
const LATEST = "CC-MAIN-2026-38";
const OLDER = "CC-MAIN-2026-30";

function setup() {
  const casualos = createFakeCasualOS();
  casualos.createRecord(LIBRARY, OWNER);
  casualos.records.get(LIBRARY)!.set(CONTENT_MANIFEST_ADDRESS, {
    data: {
      schemaVersion: 1,
      name: "Grace Community",
      customizationLocator: `${OWNER}.c1`,
      categories: [],
      updatedAt: 1,
    },
    markers: [CONTENT_LIBRARY_MARKER],
  });
  const key = casualos.signIn(OWNER);
  const commonCrawl = createFakeCommonCrawl();
  const worker = createTestWorker(casualos, commonCrawl);
  return { casualos, commonCrawl, worker, key };
}

function call(
  worker: TestWorker,
  method: "GET" | "POST",
  path: string,
  options: { key?: string; body?: unknown } = {}
) {
  const headers = new Headers({ Origin: APP_ORIGIN });
  if (options.key) {
    headers.set("Authorization", `Bearer ${options.key}`);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  return handleRequest(
    new Request(`https://import.test${path}`, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    worker.env,
    worker.deps
  );
}

async function lookUp(
  worker: TestWorker,
  key: string,
  body: Record<string, unknown> = {}
): Promise<SiteImport> {
  const response = await call(worker, "POST", "/site-imports", {
    key,
    body: {
      contentRecordName: LIBRARY,
      site: "gracecommunity.org/sermons",
      ...body,
    },
  });
  expect(response.status).toBe(201);
  const started = (await response.json()) as SiteImport;
  await worker.drain();
  return siteImport(worker, key, started.progress.id);
}

async function siteImport(
  worker: TestWorker,
  key: string,
  id: string
): Promise<SiteImport> {
  const response = await call(worker, "GET", `/site-imports/${id}`, { key });
  expect(response.status).toBe(200);
  return (await response.json()) as SiteImport;
}

async function pick(
  worker: TestWorker,
  key: string,
  id: string,
  itemIds: string[]
) {
  return call(worker, "POST", `/site-imports/${id}/pick`, {
    key,
    body: { itemIds },
  });
}

function libraryItems(casualos: FakeCasualOS): ContentItem[] {
  return [...casualos.records.get(LIBRARY)!.values()]
    .filter((entry) => entry.markers.includes(CONTENT_ITEM_MARKER))
    .map((entry) => entry.data as ContentItem);
}

function sermonPage(title: string, body = "") {
  return `<!doctype html><html><head>
    <title>${title} | Grace Community</title>
    <meta property="og:title" content="${title}">
    </head><body>
    <nav><a href="/">Home</a> Romans 1</nav>
    <article><h1>${title}</h1>${body}</article>
    <footer>Copyright Grace Community. Isaiah 40:8</footer>
    </body></html>`;
}

beforeEach(() => {
  clearCrawlCache();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("website imports", () => {
  it("lists a site's pages from the latest crawls, newest copy of each, leaving out noise", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.blockSize.value = 2;
    const site = "https://gracecommunity.org/sermons";
    commonCrawl.addPage(OLDER, `${site}/good-shepherd`, sermonPage("Old"), {
      timestamp: "20260701000000",
    });
    commonCrawl.addPage(LATEST, `${site}/good-shepherd`, sermonPage("New"), {
      timestamp: "20260901000000",
    });
    commonCrawl.addPage(LATEST, `${site}/i-am-the-door`, sermonPage("Door"));
    // The same content under a second address.
    commonCrawl.addPage(LATEST, `${site}/i-am-the-door?ref=home`, "", {
      digest: `sha1:${site}/i-am-the-door`,
    });
    commonCrawl.addPage(LATEST, `${site}/tag/john`, sermonPage("Tag"));
    commonCrawl.addPage(LATEST, `${site}/missing`, "", { status: "404" });
    commonCrawl.addPage(LATEST, `${site}/notes.pdf`, "", {
      mime: "application/pdf",
    });
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/events/picnic", "");

    const listed = await lookUp(worker, key);

    expect(listed.progress).toMatchObject({
      kind: "site",
      status: "awaiting_pick",
    });
    expect(listed.site).toBe("gracecommunity.org/sermons/");
    expect(listed.crawls.map((c) => c.id)).toEqual([
      "CC-MAIN-2026-38",
      "CC-MAIN-2026-30",
      "CC-MAIN-2026-22",
    ]);
    expect(listed.candidates!.map((c) => [c.url, c.capturedAt]).sort()).toEqual(
      [
        [`${site}/good-shepherd`, "20260901000000"],
        [`${site}/i-am-the-door`, expect.any(String)],
      ]
    );
    // Every result page of every crawl was looked at.
    expect(listed.lookups.failed).toBe(0);
    expect(listed.lookups.done).toBe(listed.lookups.total);
  });

  it("imports only the picked pages, using the full page but storing only a summary", async () => {
    const { worker, key, casualos, commonCrawl } = setup();
    const url = "https://gracecommunity.org/sermons/good-shepherd";
    commonCrawl.addPage(
      LATEST,
      url,
      `<html><head>
        <meta property="og:title" content="The Good Shepherd">
        <meta property="og:description" content="Sunday's sermon.">
        <meta property="og:image" content="/images/shepherd.jpg">
        <script type="application/ld+json">{"@type":"Article","author":{"@type":"Person","name":"Pastor Dana"}}</script>
      </head><body>
        <nav>Menu: Romans 1</nav>
        <article>
          <p>${"Some words about sheep. ".repeat(40)}</p>
          <p>Our text this morning is John 10:1&ndash;18, read alongside Psalm 23.</p>
          <p>Jesus said again, in John 10:1-18, that he is the door.</p>
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"></iframe>
        </article>
      </body></html>`
    );
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/other", "");

    const listed = await lookUp(worker, key);
    const chosen = listed.candidates!.find((c) => c.url === url)!;
    const response = await pick(worker, key, listed.progress.id, [
      chosen.itemId,
    ]);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "running",
      total: 1,
    });
    await worker.drain();

    const items = libraryItems(casualos);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: chosen.itemId,
      url,
      status: "needs_review",
      title: "The Good Shepherd",
      description: "Sunday's sermon.",
      image: "https://gracecommunity.org/images/shepherd.jpg",
      author: "Pastor Dana",
      mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      origin: {
        kind: "site",
        crawlId: LATEST,
        sourceId: listed.sourceId,
      },
      classification: { status: "done" },
    });
    // Found in the body, most-mentioned first; the menu's isn't the page's.
    expect(items[0]!.references).toEqual([
      expect.objectContaining({
        book: "JHN",
        chapter: 10,
        verse: 1,
        endVerse: 18,
        source: "explicit",
      }),
      expect.objectContaining({ book: "PSA", chapter: 23, source: "explicit" }),
    ]);
    expect(JSON.stringify(items[0])).not.toContain("Some words about sheep");
    expect(
      await (
        await call(worker, "GET", `/imports/${listed.progress.id}`, { key })
      ).json()
    ).toMatchObject({ status: "done", done: 1 });
  });

  it("reads a page in its own character set", async () => {
    const { worker, key, casualos, commonCrawl } = setup();
    const url = "https://gracecommunity.org/sermons/cafe";
    commonCrawl.addPage(
      LATEST,
      url,
      Buffer.from(
        "<html><head><title>Café church</title></head></html>",
        "latin1"
      ),
      { contentType: "text/html; charset=windows-1252" }
    );
    const listed = await lookUp(worker, key);
    await pick(worker, key, listed.progress.id, [
      listed.candidates![0]!.itemId,
    ]);
    await worker.drain();
    expect(libraryItems(casualos)[0]?.title).toBe("Café church");
  });

  it("finds a site in a big index, across several of its blocks, and nothing beside it", async () => {
    const { worker, key, commonCrawl } = setup();
    // About 700 KB of index around the site, many times the search window.
    commonCrawl.otherSites.value = 12000;
    commonCrawl.blockSize.value = 2;
    const urls = Array.from(
      { length: 7 },
      (_, i) => `https://gracecommunity.org/sermons/${i}`
    );
    for (const url of urls) {
      commonCrawl.addPage(LATEST, url, "");
    }
    // Not under the address the owner gave.
    commonCrawl.addPage(
      LATEST,
      "https://media.gracecommunity.org/sermons/x",
      ""
    );
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/blog/y", "");

    const listed = await lookUp(worker, key);
    expect(listed.candidates!.map((c) => c.url).sort()).toEqual(urls);
    // The search reads small pieces of the index, not all of it.
    const read = worker.requests.filter((r) =>
      r.url.includes("cluster.idx")
    ).length;
    expect(read).toBeLessThan(40);
  });

  it("waits and tries again when the index is overloaded, rather than finding nothing", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/a", "");
    // The crawl list answers; the first read of the index is refused once.
    commonCrawl.indexFailures.push(0, 503);

    const listed = await lookUp(worker, key);
    expect(listed.candidates!.map((c) => c.url)).toEqual([
      "https://gracecommunity.org/sermons/a",
    ]);
    expect(listed.lookups.failed).toBe(0);
  });

  it("counts an index error as a failed lookup, never as finding nothing", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/a", "");
    // The crawl list answers; the first read of the index is refused outright.
    commonCrawl.indexFailures.push(0, 400);
    const listed = await lookUp(worker, key);
    expect(listed.lookups.failed).toBe(1);
    expect(listed.progress.status).toBe("awaiting_pick");
  });

  it("says plainly when the archive has nothing from the site", async () => {
    const { worker, key } = setup();
    const listed = await lookUp(worker, key, { site: "unknown-church.org" });
    expect(listed.progress.status).toBe("awaiting_pick");
    expect(listed.candidates).toEqual([]);
    expect(listed.lookups).toMatchObject({ failed: 0 });
  });

  it("offers at most the page limit, and says it stopped there", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.blockSize.value = 1000;
    for (let i = 0; i < MAX_SITE_PAGES + 50; i++) {
      commonCrawl.addPage(
        LATEST,
        `https://gracecommunity.org/sermons/${i}`,
        ""
      );
    }
    const listed = await lookUp(worker, key);
    expect(listed.candidates).toHaveLength(MAX_SITE_PAGES);
    expect(listed.capped).toBe(true);
  });

  it("only ever contacts Common Crawl's hosts, never the site itself", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(
      LATEST,
      "https://gracecommunity.org/sermons/a",
      "<title>A</title>"
    );
    const listed = await lookUp(worker, key);
    await pick(worker, key, listed.progress.id, [
      listed.candidates![0]!.itemId,
    ]);
    await worker.drain();
    expect(new Set(worker.requests.map((r) => r.host))).toEqual(
      new Set(["data.commoncrawl.org", "casualos.test"])
    );
    expect(worker.requests.some((r) => r.url.includes("getLinkPreview"))).toBe(
      false
    );
  });

  it("says what Common Crawl answered when its crawl list can't be had", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.indexFailures.push(403);
    const response = await call(worker, "POST", "/site-imports", {
      key,
      body: { contentRecordName: LIBRARY, site: "gracecommunity.org" },
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: "common_crawl_unavailable",
      commonCrawlStatus: 403,
      commonCrawlAnswer: "Slow down",
    });
  });

  it("refuses an address that isn't a public website", async () => {
    const { worker, key } = setup();
    for (const site of [
      "http://localhost:8080/",
      "10.0.0.1/admin",
      "not a site",
    ]) {
      const response = await call(worker, "POST", "/site-imports", {
        key,
        body: { contentRecordName: LIBRARY, site },
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "invalid_site" });
    }
    expect(worker.requests.filter((r) => r.host !== "casualos.test")).toEqual(
      []
    );
  });

  it("keeps the list when the pick names no listed page", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/a", "");
    const listed = await lookUp(worker, key);
    const response = await pick(worker, key, listed.progress.id, ["item_nope"]);
    expect(response.status).toBe(400);
    expect(
      (await siteImport(worker, key, listed.progress.id)).candidates
    ).toHaveLength(1);
  });

  it("checks only crawls newer than the last one looked at", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/new", "");
    commonCrawl.addPage(OLDER, "https://gracecommunity.org/sermons/old", "");
    const listed = await lookUp(worker, key, {
      sinceCrawlId: OLDER,
      sourceId: "site_saved",
    });
    expect(listed.sourceId).toBe("site_saved");
    expect(listed.crawls.map((c) => c.id)).toEqual([LATEST]);
    expect(listed.candidates!.map((c) => c.url)).toEqual([
      "https://gracecommunity.org/sermons/new",
    ]);
  });

  it("forgets the list when cancelled, but otherwise waits for the owner however long they take", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/a", "");
    const first = await lookUp(worker, key);
    const cancelled = await call(
      worker,
      "POST",
      `/imports/${first.progress.id}/cancel`,
      { key }
    );
    expect(((await cancelled.json()) as ImportProgress).status).toBe(
      "cancelled"
    );
    const rows = () =>
      worker.db.sqlite
        .prepare("SELECT COUNT(*) AS n FROM import_items")
        .get() as { n: number };
    expect(rows().n).toBe(0);

    // A second lookup can start once the first is over. Left for two months,
    // it's still waiting, and picking then starts the import.
    const second = await lookUp(worker, key);
    expect(second.candidates).toHaveLength(1);
    worker.clock.now += 60 * 24 * 60 * 60 * 1000;
    await runCleanup(worker.env, worker.deps);
    const later = await siteImport(worker, key, second.progress.id);
    expect(later.progress.status).toBe("awaiting_pick");
    expect(later.candidates).toHaveLength(1);
    const picked = await pick(worker, key, second.progress.id, [
      later.candidates![0]!.itemId,
    ]);
    expect(((await picked.json()) as ImportProgress).status).toBe("running");
  });

  it("counts as the library's one running import", async () => {
    const { worker, key, commonCrawl } = setup();
    commonCrawl.addPage(LATEST, "https://gracecommunity.org/sermons/a", "");
    await lookUp(worker, key);
    const links = await call(worker, "POST", "/imports", {
      key,
      body: {
        contentRecordName: LIBRARY,
        items: [{ url: "https://example.org/x" }],
      },
    });
    expect(links.status).toBe(409);
  });

  it("won't look up a site for a library the caller can't change", async () => {
    const { worker, casualos } = setup();
    const stranger = casualos.signIn("someone-else");
    const response = await call(worker, "POST", "/site-imports", {
      key: stranger,
      body: { contentRecordName: LIBRARY, site: "gracecommunity.org" },
    });
    expect(response.status).toBe(403);
  });
});
