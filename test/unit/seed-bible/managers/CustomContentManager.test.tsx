import {
  ContentLibraryError,
  customContentTypeId,
  UNCATEGORIZED_ID,
  type CustomContentManager,
} from "@packages/seed-bible/seed-bible/managers/CustomContentManager";
import { CUSTOMIZATION_MARKER } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type {
  DiscoverContentResult,
  DiscoverManager,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import {
  CONTENT_MANIFEST_ADDRESS,
  contentChapterAddress,
  type ContentReference,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import type { Mock } from "vitest";
import {
  createApp,
  fakeRecordsServer,
  OWNER,
  waitForCondition,
  type FakeRecordsServer,
} from "./testUtils/customContentApp";

/** What Discover shows from custom content for a chapter. */
async function discoverContent(
  discover: DiscoverManager,
  book: string,
  chapter: number
): Promise<DiscoverContentResult[]> {
  const results: DiscoverContentResult[] = [];
  for await (const batch of discover.discover({
    translationId: "BSB",
    book,
    chapter,
    language: "en",
  })) {
    if (batch.providerId.startsWith("custom-content:")) {
      results.push(
        ...batch.results.filter(
          (r): r is DiscoverContentResult => r.type === "content"
        )
      );
    }
  }
  return results;
}

function ref(
  reference: Omit<ContentReference, "source" | "confidence">
): ContentReference {
  return { ...reference, source: "owner", confidence: 1 };
}

/** Signs in as the owner, creates a Custom Branding, opens it in the editor and gives it a library. */
async function ownerWithLibrary(server: FakeRecordsServer) {
  const app = createApp(server, { userId: OWNER });
  const created = await app.customizations.create();
  app.customizations.startEditing(created.id);
  await app.customContent.createLibrary();
  return { ...app, customizationId: created.id };
}

/**
 * A signed-out reader opening the owner's share link, once their Discover
 * has picked up the library. A fresh app has nothing cached, so what it sees
 * is exactly what's stored.
 */
async function readerOf(server: FakeRecordsServer, customizationId: string) {
  const locator = `${OWNER}.${customizationId}`;
  const reader = createApp(server, {
    userId: null,
    href: `http://localhost/?customization=${locator}`,
  });
  await reader.customizations.loadByLocator(locator);
  await waitForCondition(() =>
    reader.discover.providers.value.some((p) =>
      p.id.startsWith("custom-content:")
    )
  );
  return reader;
}

async function addSermon(
  customContent: CustomContentManager,
  overrides: Partial<Parameters<CustomContentManager["saveItem"]>[0]> = {},
  publish = true
) {
  return customContent.saveItem(
    {
      url: "https://gracecommunity.org/sermons/the-good-shepherd",
      title: "The Good Shepherd",
      description: "Jesus, the shepherd who lays down his life.",
      categoryIds: [],
      references: [ref({ book: "JHN", chapter: 10, verse: 1, endVerse: 18 })],
      ...overrides,
    },
    { publish }
  );
}

describe("CustomContentManager", () => {
  let warnSpy: Mock;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe("creating a library", () => {
    it("puts the library in a new record of its own, and only the pointer in the owner's record", async () => {
      const server = fakeRecordsServer();
      const { customContent, customizationId } = await ownerWithLibrary(server);

      const recordName = customContent.recordName.value!;
      expect(recordName).toMatch(/^seedbible-content-/);
      expect(
        server.records.get(recordName)?.has(CONTENT_MANIFEST_ADDRESS)
      ).toBe(true);

      const personal = server.records.get(OWNER)!;
      expect([...personal.keys()]).toEqual([customizationId]);
      const saved = personal.get(customizationId)!;
      expect(saved.markers).toEqual([CUSTOMIZATION_MARKER]);
      expect(
        (saved.data as { contentRecordName?: string }).contentRecordName
      ).toBe(recordName);
      expect(customContent.status.value).toBe("ready");
    });

    it("reports a plan limit and leaves the Custom Branding without a library", async () => {
      const server = fakeRecordsServer();
      const app = createApp(server, { userId: OWNER });
      const created = await app.customizations.create();
      app.customizations.startEditing(created.id);
      server.failNextCreate.code = "subscription_limit_reached";

      await expect(app.customContent.createLibrary()).rejects.toMatchObject({
        code: "subscription_limit_reached",
      });
      expect(
        app.customizations.editingCustomization.value?.contentRecordName
      ).toBeUndefined();
      expect(app.customContent.status.value).toBe("closed");
    });
  });

  describe("publishing", () => {
    it("shows a published item in Discover to a signed-out reader using the share link", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      const sermons = await owner.customContent.addCategory("Sermons");
      await addSermon(owner.customContent, { categoryIds: [sermons.id] });

      const reader = await readerOf(server, owner.customizationId);
      const results = await discoverContent(reader.discover, "JHN", 10);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: "The Good Shepherd",
        contentType: customContentTypeId(
          owner.customContent.recordName.value!,
          sermons.id
        ),
        reference: { book: "JHN", chapter: 10, verse: 1, endVerse: 18 },
      });
      expect(results[0]!.verses).toHaveLength(18);
      expect(
        reader.discover.contentTypes.value.map((type) => type.title)
      ).toContain("Sermons");
    });

    it("never shows drafts", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      await addSermon(owner.customContent, {}, false);

      const record = server.records.get(owner.customContent.recordName.value!)!;
      expect(record.has(contentChapterAddress("JHN", 10))).toBe(false);
      const reader = await readerOf(server, owner.customizationId);
      expect(await discoverContent(reader.discover, "JHN", 10)).toEqual([]);
    });

    it("leaves verses out for a whole-chapter item, so it still shows when a verse is selected", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      await addSermon(owner.customContent, {
        references: [ref({ book: "PSA", chapter: 23 })],
      });

      const reader = await readerOf(server, owner.customizationId);
      const [result] = await discoverContent(reader.discover, "PSA", 23);
      expect(result?.title).toBe("The Good Shepherd");
      expect(result?.verses).toBeUndefined();
    });

    it("moves an item between chapters when its verses change", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      const saved = await addSermon(owner.customContent, {
        references: [ref({ book: "JHN", chapter: 3 })],
      });
      await owner.customContent.saveItem({
        ...saved,
        references: [ref({ book: "JHN", chapter: 4 })],
      });

      const record = server.records.get(owner.customContent.recordName.value!)!;
      expect(record.has(contentChapterAddress("JHN", 3))).toBe(false);
      expect(record.has(contentChapterAddress("JHN", 4))).toBe(true);
      expect(owner.customContent.chapterIndex.value?.chapters).toEqual({
        "JHN.4": 1,
      });
    });

    it("takes an unpublished item out of Discover without a network read for the empty chapter", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      const saved = await addSermon(owner.customContent);
      await owner.customContent.setItemPublished(saved.id, false);

      expect(owner.customContent.chapterIndex.value?.chapters).toEqual({});
      const reader = await readerOf(server, owner.customizationId);
      expect(await discoverContent(reader.discover, "JHN", 10)).toEqual([]);
      expect(reader.os.getData).not.toHaveBeenCalledWith(
        owner.customContent.recordName.value,
        contentChapterAddress("JHN", 10)
      );
    });

    it("keeps other items on a chapter when one is deleted", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      const first = await addSermon(owner.customContent);
      await addSermon(owner.customContent, {
        url: "https://gracecommunity.org/sermons/i-am-the-door",
        title: "I Am the Door",
      });
      await owner.customContent.deleteItem(first.id);

      const reader = await readerOf(server, owner.customizationId);
      const results = await discoverContent(reader.discover, "JHN", 10);
      expect(results.map((r) => r.title)).toEqual(["I Am the Door"]);
    });

    it("refuses a link that isn't http(s) and saves nothing", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);

      await expect(
        addSermon(owner.customContent, { url: "javascript:alert(1)" })
      ).rejects.toBeInstanceOf(ContentLibraryError);
      expect(owner.customContent.items.value).toEqual([]);
    });

    it("can repair the index after a chapter write fails partway", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      server.failWritesTo.add(contentChapterAddress("JHN", 10));

      await expect(addSermon(owner.customContent)).rejects.toMatchObject({
        code: "server_error",
      });
      // The item itself was saved; only its chapter is missing.
      expect(owner.customContent.items.value).toHaveLength(1);

      server.failWritesTo.clear();
      await owner.customContent.rebuildIndex();
      const record = server.records.get(owner.customContent.recordName.value!)!;
      expect(record.has(contentChapterAddress("JHN", 10))).toBe(true);
      expect(owner.customContent.chapterIndex.value?.chapters).toEqual({
        "JHN.10": 1,
      });
    });
  });

  describe("categories", () => {
    it("moves items of a removed category into Other", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      const kids = await owner.customContent.addCategory("Kids");
      await addSermon(owner.customContent, { categoryIds: [kids.id] });
      await owner.customContent.removeCategory(kids.id);

      expect(owner.customContent.items.value[0]?.categoryIds).toEqual([]);
      const reader = await readerOf(server, owner.customizationId);
      expect(reader.discover.contentTypes.value.map((t) => t.id)).toEqual([
        customContentTypeId(
          owner.customContent.recordName.value!,
          UNCATEGORIZED_ID
        ),
      ]);
      const [result] = await discoverContent(reader.discover, "JHN", 10);
      expect(result?.contentType).toBe(
        customContentTypeId(
          owner.customContent.recordName.value!,
          UNCATEGORIZED_ID
        )
      );
    });
  });

  describe("reopening and deleting", () => {
    it("loads what was saved when the library is opened again", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      await owner.customContent.addCategory("Sermons");
      await addSermon(owner.customContent);
      const recordName = owner.customContent.recordName.value!;

      const again = createApp(server, { userId: OWNER });
      await again.customContent.openLibrary(recordName);
      expect(again.customContent.status.value).toBe("ready");
      expect(again.customContent.items.value.map((i) => i.title)).toEqual([
        "The Good Shepherd",
      ]);
      expect(
        again.customContent.manifest.value?.categories.map((c) => c.name)
      ).toEqual(["Sermons"]);
    });

    it("says the library is missing rather than failing when its record is gone", async () => {
      const server = fakeRecordsServer();
      const app = createApp(server, { userId: OWNER });
      await app.customContent.openLibrary("seedbible-content-gone");
      expect(app.customContent.status.value).toBe("missing");
    });

    it("erases the library and unlinks it from the Custom Branding", async () => {
      const server = fakeRecordsServer();
      const owner = await ownerWithLibrary(server);
      await addSermon(owner.customContent);
      const recordName = owner.customContent.recordName.value!;

      await owner.customContent.deleteLibrary();

      expect(server.records.get(recordName)?.size).toBe(0);
      const saved = server.records.get(OWNER)!.get(owner.customizationId)!;
      expect(
        (saved.data as { contentRecordName?: string }).contentRecordName
      ).toBeUndefined();
      expect(owner.customContent.status.value).toBe("closed");
      await waitForCondition(() => owner.discover.providers.value.length === 0);
    });
  });
});
