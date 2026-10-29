// @vitest-environment node
import { handleRequest } from "../../../../workers/content-import/src/api";
import { clearCrawlCache } from "../../../../workers/content-import/src/siteImports";
import { createContentImportClient } from "@packages/seed-bible/seed-bible/managers/customContent/importClient";
import {
  parseImportCsv,
  parsePastedLinks,
} from "@packages/seed-bible/seed-bible/managers/customContent/importEntries";
import { contentChapterAddress } from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import {
  APP_ORIGIN,
  createFakeCasualOS,
  createTestWorker,
} from "../../content-import-worker/harness";
import {
  createApp,
  fakeRecordsServer,
  OWNER,
  waitForCondition,
} from "./testUtils/customContentApp";

/**
 * The editor's manager, the import worker and CasualOS together: the
 * browser side talks to the worker's real request handler, and both sides
 * read and write one in-memory CasualOS.
 */
async function setup() {
  const server = fakeRecordsServer();
  const casualos = createFakeCasualOS({ records: server.records });
  const worker = createTestWorker(casualos);
  const importService = createContentImportClient(
    "https://import.test",
    (url, init) =>
      handleRequest(
        new Request(String(url), {
          ...init,
          headers: {
            ...(init?.headers as Record<string, string>),
            Origin: APP_ORIGIN,
          },
        }),
        worker.env,
        worker.deps
      )
  );
  const owner = createApp(server, {
    userId: OWNER,
    importService,
    importPollMs: 5,
  });
  owner.os.sessionKey.value = casualos.signIn(OWNER);
  const created = await owner.customizations.create();
  owner.customizations.startEditing(created.id);
  await owner.customContent.createLibrary();
  const recordName = owner.customContent.recordName.value!;
  // The browser-side fake made the record; the worker's side needs to know who owns it.
  casualos.createRecord(recordName, OWNER);
  return {
    server,
    casualos,
    worker,
    owner,
    recordName,
  };
}

beforeEach(() => {
  clearCrawlCache();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("importing into a content library", () => {
  it("adds pasted links for review, and the editor picks them up as they land", async () => {
    const { owner, worker, casualos } = await setup();
    casualos.previews.set("https://example.org/good-shepherd", {
      title: "The Good Shepherd",
    });

    const summary = await owner.customContent.importEntries(
      parsePastedLinks(
        "https://example.org/good-shepherd\nhttps://example.org/second"
      ).entries
    );
    expect(summary.queued).toBe(2);
    expect(owner.customContent.importProgress.value?.status).toBe("running");

    await worker.drain();
    await waitForCondition(
      () => owner.customContent.importProgress.value?.status === "done"
    );
    await waitForCondition(() => owner.customContent.items.value.length === 2);
    expect(
      owner.customContent.items.value.map((item) => [item.title, item.status])
    ).toContainEqual(["The Good Shepherd", "needs_review"]);
  });

  it("skips links already in the library without sending them", async () => {
    const { owner, worker } = await setup();
    await owner.customContent.saveItem({
      url: "https://www.youtube.com/watch?v=1e5paRyGr0A",
      title: "Already here",
      description: "",
      categoryIds: [],
      references: [],
    });

    const summary = await owner.customContent.importEntries([
      { url: "https://youtu.be/1e5paRyGr0A" },
      { url: "https://example.org/new" },
    ]);
    expect(summary).toMatchObject({ queued: 1, alreadyInLibrary: 1 });
    expect(worker.sent).toHaveLength(1);
  });

  it("brings a CSV's categories and passages along, and publishing puts it in Discover", async () => {
    const { owner, worker, server, recordName } = await setup();
    await owner.customContent.addCategory("Sermons");
    const csv = parseImportCsv(
      [
        "url,title,categories,passages",
        'https://example.org/a,The Good Shepherd,"Sermons; Podcasts","John 10:1-18; Not 99"',
      ].join("\n")
    )!;

    const summary = await owner.customContent.importEntries(csv.entries);
    expect(summary.unknownCategories).toEqual(["Podcasts"]);
    expect(summary.unrecognizedPassages).toEqual(["Not 99"]);
    await worker.drain();
    await waitForCondition(() => owner.customContent.items.value.length === 1);

    const imported = owner.customContent.items.value[0]!;
    expect(imported.categoryIds).toHaveLength(1);
    expect(imported.references).toMatchObject([
      { book: "JHN", chapter: 10, verse: 1, endVerse: 18 },
    ]);

    // Publishing goes through the worker's library writer.
    await owner.customContent.setItemPublished(imported.id, true);
    expect(
      server.records.get(recordName)!.has(contentChapterAddress("JHN", 10))
    ).toBe(true);
    expect(owner.customContent.chapterIndex.value?.chapters).toEqual({
      "JHN.10": 1,
    });
    // What a reader's Discover reads for John 10 (Discover itself is
    // covered in CustomContentManager.test.tsx, which runs with a DOM).
    const chapter = server.records
      .get(recordName)!
      .get(contentChapterAddress("JHN", 10))?.data as {
      entries: { title: string }[];
    };
    expect(chapter.entries.map((entry) => entry.title)).toEqual([
      "The Good Shepherd",
    ]);
  });

  it("pauses when the session ends and finishes after the owner continues it", async () => {
    const { owner, worker, casualos } = await setup();
    await owner.customContent.importEntries([
      { url: "https://example.org/a" },
      { url: "https://example.org/b" },
    ]);
    casualos.endSession(owner.os.sessionKey.value!);
    await worker.drain();

    // The owner signs in again; the editor notices the pause on its next check.
    owner.os.sessionKey.value = casualos.signIn(OWNER, "again");
    await waitForCondition(
      () => owner.customContent.importProgress.value?.status === "paused_signin"
    );
    await owner.customContent.resumeImport();
    await worker.drain();
    await waitForCondition(
      () => owner.customContent.importProgress.value?.status === "done"
    );
    await waitForCondition(() => owner.customContent.items.value.length === 2);
  });

  it("trims an over-long CSV title instead of failing the whole import", async () => {
    const { owner, worker } = await setup();
    await owner.customContent.importEntries([
      { url: "https://example.org/a", title: "x".repeat(400) },
      { url: "https://example.org/b" },
    ]);
    await worker.drain();
    await waitForCondition(() => owner.customContent.items.value.length === 2);
    expect(
      owner.customContent.items.value.find(
        (item) => item.url === "https://example.org/a"
      )?.title
    ).toHaveLength(300);
  });

  it("finds a running import again when the library is reopened", async () => {
    const { owner, recordName } = await setup();
    await owner.customContent.importEntries([{ url: "https://example.org/a" }]);
    const id = owner.customContent.importProgress.value?.id;

    owner.customContent.closeLibrary();
    expect(owner.customContent.importProgress.value).toBeNull();
    await owner.customContent.openLibrary(recordName);
    expect(owner.customContent.importProgress.value?.id).toBe(id);
  });

  it("stops an import when the owner cancels it", async () => {
    const { owner, worker } = await setup();
    await owner.customContent.importEntries([
      { url: "https://example.org/a" },
      { url: "https://example.org/b" },
    ]);
    await owner.customContent.cancelImport();
    expect(owner.customContent.importProgress.value?.status).toBe("cancelled");
    await worker.drain();
    expect(owner.customContent.items.value).toEqual([]);
  });

  describe("from a website", () => {
    const SITE = "https://gracecommunity.org/sermons";

    async function lookedUp(
      context: Awaited<ReturnType<typeof setup>>,
      look: () => Promise<void>
    ) {
      await look();
      expect(context.owner.customContent.siteImport.value).not.toBeNull();
      await context.worker.drain();
      await waitForCondition(
        () => !!context.owner.customContent.siteImport.value?.candidates
      );
    }

    it("imports the pages the owner picks, leaving out ones already in the library, and remembers the site", async () => {
      const context = await setup();
      const { owner, worker } = context;
      worker.commonCrawl.addPage(
        "CC-MAIN-2026-38",
        `${SITE}/good-shepherd`,
        "<title>The Good Shepherd</title><p>Our text: John 10:1-18.</p>"
      );
      worker.commonCrawl.addPage(
        "CC-MAIN-2026-38",
        `${SITE}/door`,
        "<title>The Door</title>"
      );
      await owner.customContent.saveItem({
        url: `${SITE}/door/`,
        title: "Already here",
        description: "",
        categoryIds: [],
        references: [],
      });

      await lookedUp(context, () =>
        owner.customContent.startSiteImport({
          site: "gracecommunity.org/sermons",
        })
      );
      const { pages, alreadyInLibrary } =
        owner.customContent.siteCandidates.value;
      expect(pages.map((p) => p.url)).toEqual([`${SITE}/good-shepherd`]);
      expect(alreadyInLibrary).toBe(1);

      await owner.customContent.pickSitePages(pages.map((p) => p.itemId));
      expect(owner.customContent.siteImport.value).toBeNull();
      expect(owner.customContent.manifest.value?.siteSources).toEqual([
        expect.objectContaining({
          site: "gracecommunity.org/sermons/",
          newestCrawlId: "CC-MAIN-2026-38",
        }),
      ]);
      await worker.drain();
      await waitForCondition(
        () => owner.customContent.items.value.length === 2
      );
      expect(
        owner.customContent.items.value.find(
          (item) => item.title === "The Good Shepherd"
        )
      ).toMatchObject({
        status: "needs_review",
        references: [{ book: "JHN", chapter: 10, verse: 1, endVerse: 18 }],
      });
    });

    it("checks a saved site again only in newer crawls", async () => {
      const context = await setup();
      const { owner, worker } = context;
      worker.commonCrawl.addPage(
        "CC-MAIN-2026-38",
        `${SITE}/a`,
        "<title>A</title>"
      );
      await lookedUp(context, () =>
        owner.customContent.startSiteImport({
          site: "gracecommunity.org/sermons",
        })
      );
      await owner.customContent.pickSitePages(
        owner.customContent.siteCandidates.value.pages.map((p) => p.itemId)
      );
      await worker.drain();
      await waitForCondition(
        () => owner.customContent.importProgress.value?.status === "done"
      );

      // A month later, a new crawl has a new sermon.
      worker.clock.now += 30 * 24 * 60 * 60 * 1000;
      worker.commonCrawl.crawls.unshift({
        id: "CC-MAIN-2026-43",
        name: "October",
      });
      worker.commonCrawl.addPage(
        "CC-MAIN-2026-43",
        `${SITE}/b`,
        "<title>B</title>"
      );
      const source = owner.customContent.manifest.value!.siteSources![0]!;
      await lookedUp(context, () =>
        owner.customContent.checkSiteForNewPages(source.id)
      );
      expect(
        owner.customContent.siteImport.value?.crawls.map((c) => c.id)
      ).toEqual(["CC-MAIN-2026-43"]);
      expect(
        owner.customContent.siteCandidates.value.pages.map((p) => p.url)
      ).toEqual([`${SITE}/b`]);
    });

    it("finds a website waiting for a pick again when the library is reopened", async () => {
      const context = await setup();
      const { owner, worker, recordName } = context;
      worker.commonCrawl.addPage("CC-MAIN-2026-38", `${SITE}/a`, "");
      await lookedUp(context, () =>
        owner.customContent.startSiteImport({
          site: "gracecommunity.org/sermons",
        })
      );
      owner.customContent.closeLibrary();
      expect(owner.customContent.siteImport.value).toBeNull();
      await owner.customContent.openLibrary(recordName);
      expect(owner.customContent.siteImport.value?.candidates).toHaveLength(1);
    });
  });
});
