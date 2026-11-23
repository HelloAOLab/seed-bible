// @vitest-environment node
import { handleRequest } from "../../../workers/content-import/src/api";
import { runCleanup } from "../../../workers/content-import/src/cleanup";
import {
  LEASE_MS,
  JOB_LIFETIME_MS,
  STALLED_AFTER_MS,
  claimNextItem,
  finishIfComplete,
} from "../../../workers/content-import/src/jobs";
import {
  CONTENT_CHAPTER_INDEX_ADDRESS,
  CONTENT_CHAPTER_MARKER,
  CONTENT_IMPORT_STATUS_ADDRESS,
  CONTENT_ITEM_MARKER,
  CONTENT_LIBRARY_MARKER,
  CONTENT_MANIFEST_ADDRESS,
  contentChapterAddress,
  contentItemAddress,
  type ContentItem,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import type { ImportProgress } from "@packages/seed-bible/seed-bible/managers/customContent/importApi";
import {
  APP_ORIGIN,
  createFakeCasualOS,
  createTestWorker,
  type FakeCasualOS,
  type TestWorker,
} from "./harness";

const OWNER = "owner-1";
const LIBRARY = "seedbible-content-test";

function setup() {
  const casualos = createFakeCasualOS();
  casualos.createRecord(LIBRARY, OWNER);
  casualos.records.get(LIBRARY)!.set(CONTENT_MANIFEST_ADDRESS, {
    data: {
      schemaVersion: 1,
      name: "Grace Community",
      customizationLocator: `${OWNER}.c1`,
      defaultAuthor: "Grace Community Church",
      categories: [{ id: "sermons", name: "Sermons" }],
      updatedAt: 1,
    },
    markers: [CONTENT_LIBRARY_MARKER],
  });
  const key = casualos.signIn(OWNER);
  const worker = createTestWorker(casualos);
  return { casualos, worker, key };
}

function call(
  worker: TestWorker,
  method: "GET" | "POST" | "OPTIONS",
  path: string,
  options: { key?: string | null; body?: unknown; origin?: string } = {}
) {
  const headers = new Headers({ Origin: options.origin ?? APP_ORIGIN });
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

async function startImport(
  worker: TestWorker,
  key: string,
  items: unknown[]
): Promise<ImportProgress> {
  const response = await call(worker, "POST", "/imports", {
    key,
    body: { contentRecordName: LIBRARY, items },
  });
  expect(response.status).toBe(201);
  return (await response.json()) as ImportProgress;
}

async function progressOf(worker: TestWorker, key: string, id: string) {
  const response = await call(worker, "GET", `/imports/${id}`, { key });
  return (await response.json()) as ImportProgress;
}

function libraryItems(casualos: FakeCasualOS): ContentItem[] {
  return [...casualos.records.get(LIBRARY)!.values()]
    .filter((entry) => entry.markers.includes(CONTENT_ITEM_MARKER))
    .map((entry) => entry.data as ContentItem);
}

function storedKey(worker: TestWorker, id: string) {
  return (
    worker.db.sqlite
      .prepare("SELECT session_key_enc FROM import_jobs WHERE id = ?")
      .get(id) as { session_key_enc: string | null }
  ).session_key_enc;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("content import worker", () => {
  describe("who may call it", () => {
    it("turns away a request without a session key, or with one CasualOS doesn't accept", async () => {
      const { worker, casualos } = setup();
      expect((await call(worker, "GET", "/imports/x")).status).toBe(401);
      expect(
        (await call(worker, "GET", "/imports/x", { key: "vSK1.garbage" }))
          .status
      ).toBe(401);
      const ended = casualos.signIn(OWNER, "old-session");
      casualos.endSession(ended);
      expect(
        (await call(worker, "GET", "/imports/x", { key: ended })).status
      ).toBe(401);
    });

    it("only answers pages from the app's own origins", async () => {
      const { worker, key } = setup();
      const response = await call(worker, "GET", "/imports/x", {
        key,
        origin: "https://elsewhere.test",
      });
      expect(response.status).toBe(403);
      const preflight = await call(worker, "OPTIONS", "/imports");
      expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(
        APP_ORIGIN
      );
      expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain(
        "Authorization"
      );
    });

    it("refuses to import into a library the caller can't write to", async () => {
      const { worker, casualos } = setup();
      const stranger = casualos.signIn("someone-else");
      const response = await call(worker, "POST", "/imports", {
        key: stranger,
        body: {
          contentRecordName: LIBRARY,
          items: [{ url: "https://example.org/a" }],
        },
      });
      expect(response.status).toBe(403);
      expect(worker.sent).toEqual([]);
    });

    it("calls CasualOS as the app's origin, and says plainly when CasualOS won't accept it", async () => {
      const { worker, key, casualos } = setup();
      expect(
        (
          await call(worker, "GET", `/imports?contentRecordName=${LIBRARY}`, {
            key,
          })
        ).status
      ).toBe(200);

      casualos.allowedOrigins.clear();
      const refused = await call(
        worker,
        "GET",
        `/imports?contentRecordName=${LIBRARY}`,
        { key: casualos.signIn(OWNER, "session-2") }
      );
      expect(refused.status).toBe(500);
      expect(await refused.json()).toMatchObject({
        error: "worker_misconfigured",
      });
    });

    it("reports a temporary CasualOS failure as such, not as a permission problem", async () => {
      const { worker, key, casualos } = setup();
      casualos.failures.set("recordData", { code: "server_error", times: 1 });
      const response = await call(worker, "POST", "/imports", {
        key,
        body: {
          contentRecordName: LIBRARY,
          items: [{ url: "https://example.org/a" }],
        },
      });
      expect(response.status).toBe(502);
      expect(worker.sent).toEqual([]);
    });

    it("says when the library doesn't exist", async () => {
      const { worker, key } = setup();
      const response = await call(worker, "POST", "/imports", {
        key,
        body: {
          contentRecordName: "seedbible-content-missing",
          items: [{ url: "https://example.org/a" }],
        },
      });
      expect(response.status).toBe(404);
    });

    it("hides other people's imports", async () => {
      const { worker, key, casualos } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      const stranger = casualos.signIn("someone-else");
      expect(
        (await call(worker, "GET", `/imports/${started.id}`, { key: stranger }))
          .status
      ).toBe(404);
    });
  });

  describe("importing", () => {
    it("fills in each link from its preview and adds it for review", async () => {
      const { worker, key, casualos } = setup();
      casualos.previews.set("https://example.org/good-shepherd", {
        title: "The Good Shepherd",
        description: "A sermon on John 10.",
        imageUrl: "https://example.org/thumb.jpg",
      });

      const started = await startImport(worker, key, [
        { url: "https://example.org/good-shepherd" },
        { url: "https://www.example.org/good-shepherd/" },
        { url: "https://example.org/second" },
      ]);
      expect(started).toMatchObject({
        status: "running",
        total: 2,
        skipped: 1,
      });
      await worker.drain();

      const items = libraryItems(casualos);
      expect(items).toHaveLength(2);
      expect(
        items.find((i) => i.url === "https://example.org/good-shepherd")
      ).toMatchObject({
        status: "needs_review",
        title: "The Good Shepherd",
        description: "A sermon on John 10.",
        image: "https://example.org/thumb.jpg",
        author: "Grace Community Church",
      });
      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 2,
        failed: 0,
      });
    });

    it("takes the site's name off a previewed title, but never off one the owner gave", async () => {
      const { worker, key, casualos } = setup();
      for (const url of ["https://example.org/a", "https://example.org/b"]) {
        casualos.previews.set(url, {
          title: "The Good Shepherd | Grace Community Church",
          siteName: "Grace Community Church",
        });
      }
      await startImport(worker, key, [
        { url: "https://example.org/a" },
        {
          url: "https://example.org/b",
          title: "Our Series | Grace Community Church",
        },
      ]);
      await worker.drain();
      expect(
        Object.fromEntries(libraryItems(casualos).map((i) => [i.url, i.title]))
      ).toEqual({
        "https://example.org/a": "The Good Shepherd",
        "https://example.org/b": "Our Series | Grace Community Church",
      });
    });

    it("keeps what the owner supplied over the page's own details", async () => {
      const { worker, key, casualos } = setup();
      await startImport(worker, key, [
        {
          url: "https://example.org/a",
          title: "My title",
          author: "Pastor Dana",
          categoryIds: ["sermons"],
          references: [
            { book: "JHN", chapter: 10, source: "owner", confidence: 1 },
          ],
        },
      ]);
      await worker.drain();
      expect(libraryItems(casualos)[0]).toMatchObject({
        title: "My title",
        author: "Pastor Dana",
        categoryIds: ["sermons"],
        references: [{ book: "JHN", chapter: 10 }],
      });
    });

    it("still adds a link whose page can't be previewed, for the owner to fill in", async () => {
      const { worker, key, casualos } = setup();
      casualos.previews.set("https://example.org/a", "unacceptable_url");
      await startImport(worker, key, [{ url: "https://example.org/a" }]);
      await worker.drain();
      expect(libraryItems(casualos)[0]).toMatchObject({
        url: "https://example.org/a",
        title: "",
        status: "needs_review",
      });
    });

    it("never puts the session key on the queue, and erases it when the import ends", async () => {
      const { worker, key } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      expect(JSON.stringify(worker.sent)).not.toContain(key);
      const stored = storedKey(worker, started.id);
      expect(stored).toBeTruthy();
      expect(stored).not.toContain(key);

      await worker.drain();
      expect(storedKey(worker, started.id)).toBeNull();
    });

    it("writes the summary to the library once, however many links finish together", async () => {
      const { worker, key, casualos } = setup();
      const started = await startImport(
        worker,
        key,
        Array.from({ length: 6 }, (_, i) => ({
          url: `https://example.org/${i}`,
        }))
      );
      await worker.drain({ batchSize: 10 });

      const summaries = casualos.calls.filter(
        (c) =>
          c.procedure === "recordData" &&
          c.input.address === CONTENT_IMPORT_STATUS_ADDRESS &&
          (c.input.data as { status?: string }).status === "done"
      );
      expect(summaries).toHaveLength(1);
      expect(
        casualos.records.get(LIBRARY)!.get(CONTENT_IMPORT_STATUS_ADDRESS)?.data
      ).toMatchObject({ jobId: started.id, status: "done", done: 6 });
    });

    it("ends an import whose links couldn't be queued, so another can start", async () => {
      const { worker, key } = setup();
      worker.queue.failSends = 1;

      const refused = await call(worker, "POST", "/imports", {
        key,
        body: {
          contentRecordName: LIBRARY,
          items: [{ url: "https://example.org/a" }],
        },
      });
      expect(refused.status).toBe(503);
      expect(await refused.json()).toMatchObject({
        error: "queue_unavailable",
      });

      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      await worker.drain();
      expect(started.status).toBe("running");
    });

    it("keeps the last import's summary when a new start is refused", async () => {
      const { worker, key, casualos } = setup();
      const finished = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      await worker.drain();

      const response = await call(worker, "POST", "/imports", {
        key,
        body: { contentRecordName: LIBRARY, items: [{ url: "not a link" }] },
      });
      expect(response.status).toBe(400);
      expect(
        casualos.records.get(LIBRARY)!.get(CONTENT_IMPORT_STATUS_ADDRESS)?.data
      ).toMatchObject({ jobId: finished.id, status: "done" });
    });

    it("lets only the first of several finishers end the import", async () => {
      const { worker, key } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      await worker.drain();
      // Two consumers that each settled a last link both ask to finish.
      expect(
        await finishIfComplete(worker.env.DB, started.id, worker.clock.now)
      ).toBe(false);
    });

    it("refuses a second import while one is running for the same library", async () => {
      const { worker, key } = setup();
      const first = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      const response = await call(worker, "POST", "/imports", {
        key,
        body: {
          contentRecordName: LIBRARY,
          items: [{ url: "https://example.org/b" }],
        },
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: "import_running",
        jobId: first.id,
      });
    });

    it("leaves an item alone if it already exists", async () => {
      const { worker, key, casualos } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      // The owner got to the item first (say, after an earlier attempt saved it).
      const itemId = (
        worker.db.sqlite
          .prepare("SELECT item_id FROM import_items WHERE job_id = ?")
          .get(started.id) as { item_id: string }
      ).item_id;
      casualos.records.get(LIBRARY)!.set(contentItemAddress(itemId), {
        data: { title: "Edited by the owner" },
        markers: [CONTENT_ITEM_MARKER],
      });
      await worker.drain();
      expect(
        casualos.records.get(LIBRARY)!.get(contentItemAddress(itemId))?.data
      ).toEqual({ title: "Edited by the owner" });
      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 1,
      });
    });
  });

  describe("when things go wrong", () => {
    it("retries a passing failure, then marks the link failed once retries run out", async () => {
      const { worker, key, casualos } = setup();
      const flaky = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      casualos.failures.set("recordData", { code: "server_error", times: 3 });
      await worker.drain();
      expect(await progressOf(worker, key, flaky.id)).toMatchObject({
        status: "done",
        done: 1,
      });

      // Now a failure that never clears.
      const stuck = await startImport(worker, key, [
        { url: "https://example.org/b" },
      ]);
      casualos.failures.set("recordData", {
        code: "server_error",
        times: 1000,
      });
      await worker.drain();
      casualos.failures.clear();
      expect(await progressOf(worker, key, stuck.id)).toMatchObject({
        status: "done",
        done: 0,
        failed: 1,
      });
      expect(
        worker.db.sqlite
          .prepare("SELECT attempts, error FROM import_items WHERE job_id = ?")
          .get(stuck.id)
      ).toEqual({
        attempts: 5,
        error: "gave_up_after_retries; last: server_error",
      });
    });

    it("waits longer before each retry, and carries on with other links meanwhile", async () => {
      const { worker, key, casualos } = setup();
      // Saving the flaky link always fails for a passing reason.
      const saves: { url: string; at: number }[] = [];
      const fakeFetch = casualos.fetch;
      casualos.fetch = async (input, init) => {
        const body = JSON.parse(String(init?.body)) as {
          procedure: string;
          input: { data?: { url?: string } };
        };
        const url = body.input.data?.url;
        if (body.procedure === "recordData" && url) {
          saves.push({ url, at: worker.clock.now });
          if (url === "https://example.org/flaky") {
            return Response.json({
              success: false,
              errorCode: "server_error",
              errorMessage: "server_error",
            });
          }
        }
        return fakeFetch(input, init);
      };
      const started = await startImport(worker, key, [
        { url: "https://example.org/flaky" },
        { url: "https://example.org/b" },
        { url: "https://example.org/c" },
        { url: "https://example.org/d" },
      ]);
      const savesOf = (url: string) =>
        saves.filter((save) => save.url === url).map((save) => save.at);
      const startedAt = worker.clock.now;
      await worker.drain();

      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 3,
        failed: 1,
      });
      const tries = savesOf("https://example.org/flaky");
      expect(tries).toHaveLength(5);
      expect(tries.slice(1).map((at, i) => at - tries[i]!)).toEqual([
        30_000, 60_000, 120_000, 240_000,
      ]);
      // The other links didn't wait for the flaky one's retries.
      for (const url of ["b", "c", "d"]) {
        expect(savesOf(`https://example.org/${url}`)).toEqual([startedAt]);
      }
    });

    it("pauses when the session ends, and carries on after the owner signs in again", async () => {
      const { worker, key, casualos } = setup();
      const started = await startImport(
        worker,
        key,
        Array.from({ length: 4 }, (_, i) => ({
          url: `https://example.org/${i}`,
        }))
      );
      casualos.endSession(key);
      await worker.drain();

      const paused = await progressOf(
        worker,
        casualos.signIn(OWNER, "s2"),
        started.id
      );
      expect(paused).toMatchObject({
        status: "paused_signin",
        done: 0,
        queued: 4,
      });
      expect(storedKey(worker, started.id)).toBeNull();
      expect(libraryItems(casualos)).toEqual([]);

      const fresh = casualos.signIn(OWNER, "s3");
      const resumed = await call(
        worker,
        "POST",
        `/imports/${started.id}/resume`,
        {
          key: fresh,
        }
      );
      expect(resumed.status).toBe(200);
      await worker.drain();
      expect(await progressOf(worker, fresh, started.id)).toMatchObject({
        status: "done",
        done: 4,
      });
      expect(libraryItems(casualos)).toHaveLength(4);
    });

    it("stops working on links once cancelled", async () => {
      const { worker, key, casualos } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
        { url: "https://example.org/b" },
      ]);
      const response = await call(
        worker,
        "POST",
        `/imports/${started.id}/cancel`,
        {
          key,
        }
      );
      expect(await response.json()).toMatchObject({ status: "cancelled" });
      await worker.drain();
      expect(libraryItems(casualos)).toEqual([]);
      expect(storedKey(worker, started.id)).toBeNull();
    });
  });

  describe("sharing the work fairly", () => {
    it("lets an import run three links at once, and frees a slot whose lease ran out", async () => {
      const { worker, key } = setup();
      const started = await startImport(
        worker,
        key,
        Array.from({ length: 4 }, (_, i) => ({
          url: `https://example.org/${i}`,
        }))
      );
      const now = worker.clock.now;
      const claimed = new Set<string>();
      for (let i = 0; i < 3; i++) {
        const claim = await claimNextItem(worker.env.DB, started.id, now);
        expect(claim.kind).toBe("claimed");
        if (claim.kind === "claimed") {
          claimed.add(claim.item.item_id);
        }
      }
      expect(claimed.size).toBe(3);
      expect(await claimNextItem(worker.env.DB, started.id, now)).toEqual({
        kind: "full",
      });

      // The three consumers die; once their leases end, cleanup puts the
      // links back in line, sends a message for each, and the work goes on.
      worker.clock.now += LEASE_MS + 1;
      worker.pending.length = 0;
      await runCleanup(worker.env, worker.deps);
      expect(worker.pending).toHaveLength(3);
      await worker.drain();
      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 4,
      });
    });

    it("keeps one message per slot on the queue, rather than one per link waiting for a slot", async () => {
      const { worker, key } = setup();
      const started = await startImport(
        worker,
        key,
        Array.from({ length: 30 }, (_, i) => ({
          url: `https://example.org/${i}`,
        }))
      );
      expect(worker.sent).toHaveLength(3);
      await worker.drain();

      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 30,
      });
      // Each link is started by one message.
      expect(worker.sent.length).toBeLessThanOrEqual(30);
    });

    it("picks an import back up once the queue works again, after its messages were lost", async () => {
      const { worker, key } = setup();
      const started = await startImport(
        worker,
        key,
        Array.from({ length: 30 }, (_, i) => ({
          url: `https://example.org/${i}`,
        }))
      );
      // The queue's daily limit: every send fails. Each message can't hand
      // on, so it's retried (taking another link each time) until it runs
      // out of retries and is dead-lettered, with links still waiting.
      worker.queue.failSends = Infinity;
      await worker.drain();
      const stalled = await progressOf(worker, key, started.id);
      expect(stalled.status).toBe("running");
      expect(stalled.queued).toBeGreaterThan(0);

      // Cleanup leaves it alone while it might still be moving...
      worker.queue.failSends = 0;
      await runCleanup(worker.env, worker.deps);
      expect(worker.pending).toHaveLength(0);

      // ...and restarts it once it clearly isn't.
      worker.clock.now += STALLED_AFTER_MS + 1;
      await runCleanup(worker.env, worker.deps);
      await worker.drain();
      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 30,
        failed: 0,
      });
    });

    it("finishes links still queued from before they were taken in turn", async () => {
      const { worker, key } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
        { url: "https://example.org/b" },
      ]);
      worker.pending.length = 0;
      const ids = (
        worker.db.sqlite
          .prepare("SELECT item_id FROM import_items WHERE job_id = ?")
          .all(started.id) as { item_id: string }[]
      ).map((row) => row.item_id);
      for (const itemId of ids) {
        await worker.env.IMPORT_QUEUE.send({ jobId: started.id, itemId });
      }
      await worker.drain();
      expect(await progressOf(worker, key, started.id)).toMatchObject({
        status: "done",
        done: 2,
      });
    });
  });

  describe("cleanup", () => {
    it("ends an import that's been paused too long, erasing its key", async () => {
      const { worker, key, casualos } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      casualos.endSession(key);
      await worker.drain();
      worker.clock.now += JOB_LIFETIME_MS + 1;
      await runCleanup(worker.env, worker.deps);
      expect(
        await progressOf(worker, casualos.signIn(OWNER, "s2"), started.id)
      ).toMatchObject({ status: "expired" });
      expect(storedKey(worker, started.id)).toBeNull();
    });

    it("deletes finished imports' rows after a while", async () => {
      const { worker, key } = setup();
      const started = await startImport(worker, key, [
        { url: "https://example.org/a" },
      ]);
      await worker.drain();
      worker.clock.now += 31 * 24 * 60 * 60 * 1000;
      await runCleanup(worker.env, worker.deps);
      expect(
        worker.db.sqlite
          .prepare("SELECT COUNT(*) AS n FROM import_items WHERE job_id = ?")
          .get(started.id)
      ).toEqual({ n: 0 });
    });
  });

  describe("publishing", () => {
    it("builds the chapters of published items, and a full rebuild clears stale ones", async () => {
      const { worker, key, casualos } = setup();
      const record = casualos.records.get(LIBRARY)!;
      const published: ContentItem = {
        id: "item-1",
        url: "https://example.org/a",
        status: "published",
        title: "The Good Shepherd",
        description: "",
        categoryIds: ["sermons"],
        references: [
          { book: "JHN", chapter: 10, source: "owner", confidence: 1 },
        ],
        createdAt: 1,
        updatedAt: 1,
      };
      record.set(contentItemAddress("item-1"), {
        data: published,
        markers: [CONTENT_ITEM_MARKER],
      });
      record.set(contentChapterAddress("GEN", 1), {
        data: { stale: true },
        markers: [CONTENT_CHAPTER_MARKER],
      });

      const response = await call(worker, "POST", "/publish", {
        key,
        body: { contentRecordName: LIBRARY, full: true },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        chapters: { "JHN.10": 1 },
      });
      expect(record.has(contentChapterAddress("JHN", 10))).toBe(true);
      expect(record.has(contentChapterAddress("GEN", 1))).toBe(false);
      expect(record.get(CONTENT_CHAPTER_INDEX_ADDRESS)?.data).toMatchObject({
        chapters: { "JHN.10": 1 },
      });
    });

    it("won't publish into someone else's library", async () => {
      const { worker, casualos } = setup();
      const stranger = casualos.signIn("someone-else");
      const response = await call(worker, "POST", "/publish", {
        key: stranger,
        body: { contentRecordName: LIBRARY, keys: ["JHN.10"] },
      });
      expect(response.status).toBe(403);
    });
  });
});
