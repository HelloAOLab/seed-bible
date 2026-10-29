import type { ChatProvider } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type {
  ContentClassificationRequest,
  ContentClassificationResult,
} from "@packages/seed-bible/seed-bible/managers/customContent/classify";
import {
  CONTENT_ITEM_MARKER,
  contentChapterAddress,
  contentItemAddress,
  type ContentItem,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import {
  createApp,
  fakeRecordsServer,
  OWNER,
  waitForCondition,
  type FakeRecordsServer,
} from "./testUtils/customContentApp";

/** A chat provider as an extension would register it, answering `classifyContent` however the test says. */
function classifierProvider(
  answer: (
    request: ContentClassificationRequest
  ) => Promise<ContentClassificationResult>
) {
  const classifyContent = vi.fn(answer);
  const provider: ChatProvider = {
    id: "test-agent",
    name: "Test agent",
    supportsSharedChats: false,
    generateResponse: () => null,
    classifyContent,
  };
  return { provider, classifyContent };
}

function imported(
  id: string,
  overrides: Partial<ContentItem> = {}
): ContentItem {
  return {
    id,
    url: `https://example.org/${id}`,
    status: "needs_review",
    title: "The Good Shepherd",
    description: "A sermon on John 10:1-18.",
    categoryIds: [],
    references: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

/**
 * An owner with a library holding the given items, as an import would have
 * left them, and the library open in the editor.
 */
async function setup(
  server: FakeRecordsServer,
  items: ContentItem[],
  options: {
    providers?: ChatProvider[];
    classifierId?: string;
    autoPublish?: boolean;
  } = {}
) {
  const app = createApp(server, {
    userId: OWNER,
    chatProviders: options.providers,
  });
  const created = await app.customizations.create();
  app.customizations.startEditing(created.id);
  await app.customContent.createLibrary();
  const sermons = await app.customContent.addCategory("Sermons");
  if (options.classifierId) {
    await app.customContent.setClassifier(options.classifierId);
  }
  if (options.autoPublish) {
    await app.customContent.setAutoPublish(true);
  }
  const recordName = app.customContent.recordName.value!;
  for (const item of items) {
    server.records.get(recordName)!.set(contentItemAddress(item.id), {
      data: item,
      markers: [CONTENT_ITEM_MARKER],
    });
  }
  await app.customContent.openLibrary(recordName);
  return { ...app, recordName, sermons };
}

function stored(server: FakeRecordsServer, recordName: string, id: string) {
  return server.records.get(recordName)!.get(contentItemAddress(id))
    ?.data as ContentItem;
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("suggesting categories and passages", () => {
  it("asks the chosen provider, and saves its checked suggestions on the item", async () => {
    const server = fakeRecordsServer();
    let sermonsId = "";
    const { provider, classifyContent } = classifierProvider(async () => ({
      categoryIds: [sermonsId, "not-a-category"],
      passages: [
        { reference: "Psalm 23", confidence: 0.9 },
        { reference: "John 99", confidence: 0.9 },
      ],
      suggestedCategories: ["Holy Week"],
    }));
    const app = createApp(server, { userId: OWNER, chatProviders: [provider] });
    const created = await app.customizations.create();
    app.customizations.startEditing(created.id);
    await app.customContent.createLibrary();
    sermonsId = (await app.customContent.addCategory("Sermons")).id;
    await app.customContent.setClassifier("test-agent");
    const recordName = app.customContent.recordName.value!;
    server.records.get(recordName)!.set(contentItemAddress("a"), {
      data: imported("a"),
      markers: [CONTENT_ITEM_MARKER],
    });
    await app.customContent.openLibrary(recordName);

    await waitForCondition(
      () => !!stored(server, recordName, "a").classification
    );
    const item = stored(server, recordName, "a");
    expect(classifyContent.mock.calls[0]![0]).toMatchObject({
      knownPassages: ["John 10:1-18"],
      categories: [{ id: sermonsId, name: "Sermons" }],
    });
    expect(item.categoryIds).toEqual([sermonsId]);
    expect(item.references).toEqual([
      {
        book: "JHN",
        chapter: 10,
        verse: 1,
        endVerse: 18,
        source: "explicit",
        confidence: 1,
      },
      { book: "PSA", chapter: 23, source: "ai", confidence: 0.9 },
    ]);
    expect(item.classification).toMatchObject({
      status: "done",
      providerId: "test-agent",
      suggestedCategories: ["Holy Week"],
    });
    expect(item.status).toBe("needs_review");
  });

  it("finds passages named in the text even with no AI set up, and asks the AI once one is chosen", async () => {
    const server = fakeRecordsServer();
    const { provider, classifyContent } = classifierProvider(async () => ({
      categoryIds: [],
      passages: [{ reference: "Ezekiel 34", confidence: 0.8 }],
    }));
    const app = await setup(server, [imported("a")], { providers: [provider] });

    await waitForCondition(
      () => !!stored(server, app.recordName, "a").classification
    );
    expect(classifyContent).not.toHaveBeenCalled();
    expect(stored(server, app.recordName, "a").references).toMatchObject([
      { book: "JHN", chapter: 10, source: "explicit" },
    ]);

    await app.customContent.setClassifier("test-agent");
    await waitForCondition(
      () =>
        stored(server, app.recordName, "a").classification?.providerId ===
        "test-agent"
    );
    expect(
      stored(server, app.recordName, "a").references.map((r) => r.book)
    ).toEqual(["JHN", "EZK"]);
  });

  it("marks an item whose suggestions failed, keeps what its text names, and doesn't retry on its own", async () => {
    const server = fakeRecordsServer();
    const { provider, classifyContent } = classifierProvider(async () => {
      throw new Error("Agent unavailable");
    });
    const app = await setup(server, [imported("a")], {
      providers: [provider],
      classifierId: "test-agent",
    });

    await waitForCondition(
      () => !!stored(server, app.recordName, "a").classification
    );
    expect(stored(server, app.recordName, "a")).toMatchObject({
      references: [{ book: "JHN", source: "explicit" }],
      classification: { status: "failed", error: "Agent unavailable" },
    });
    await waitForCondition(() => app.customContent.classifyQueue.value === 0);
    expect(classifyContent).toHaveBeenCalledTimes(1);

    classifyContent.mockImplementationOnce(async () => ({
      categoryIds: [],
      passages: [],
    }));
    await app.customContent.classifyItem("a");
    expect(stored(server, app.recordName, "a").classification?.status).toBe(
      "done"
    );
  });

  it("publishes confident items straight away when auto-publish is on, and leaves unsure ones for review", async () => {
    const server = fakeRecordsServer();
    const { provider } = classifierProvider(async (request) => ({
      categoryIds: [],
      passages:
        request.content.title === "Sure"
          ? [{ reference: "Psalm 23", confidence: 0.9 }]
          : [{ reference: "Psalm 46", confidence: 0.6 }],
    }));
    const app = await setup(
      server,
      [
        imported("sure", { title: "Sure", description: "" }),
        imported("unsure", { title: "Unsure", description: "" }),
      ],
      { providers: [provider], classifierId: "test-agent", autoPublish: true }
    );

    await waitForCondition(
      () =>
        !!stored(server, app.recordName, "sure").classification &&
        !!stored(server, app.recordName, "unsure").classification
    );
    expect(stored(server, app.recordName, "sure").status).toBe("published");
    expect(stored(server, app.recordName, "unsure").status).toBe(
      "needs_review"
    );
    await waitForCondition(() =>
      server.records.get(app.recordName)!.has(contentChapterAddress("PSA", 23))
    );
    expect(
      server.records.get(app.recordName)!.has(contentChapterAddress("PSA", 46))
    ).toBe(false);
  });

  it("leaves drafts and published items alone", async () => {
    const server = fakeRecordsServer();
    const { provider, classifyContent } = classifierProvider(async () => ({
      categoryIds: [],
      passages: [],
    }));
    await setup(
      server,
      [
        imported("draft", { status: "draft" }),
        imported("published", { status: "published" }),
      ],
      { providers: [provider], classifierId: "test-agent" }
    );
    // Give the queue a chance to (wrongly) start.
    await Promise.resolve();
    expect(classifyContent).not.toHaveBeenCalled();
  });

  it("asks about two items at a time", async () => {
    const server = fakeRecordsServer();
    const pending: (() => void)[] = [];
    let inFlight = 0;
    let mostInFlight = 0;
    const { provider } = classifierProvider(
      () =>
        new Promise((resolve) => {
          inFlight++;
          mostInFlight = Math.max(mostInFlight, inFlight);
          pending.push(() => {
            inFlight--;
            resolve({ categoryIds: [], passages: [] });
          });
        })
    );
    const app = await setup(
      server,
      ["a", "b", "c", "d"].map((id) => imported(id)),
      { providers: [provider], classifierId: "test-agent" }
    );

    for (let answered = 0; answered < 4; answered++) {
      await waitForCondition(() => pending.length > 0);
      pending.shift()!();
    }
    await waitForCondition(() => app.customContent.classifyQueue.value === 0);
    expect(mostInFlight).toBe(2);
  });

  it("only finds named passages when the chosen provider's extension isn't installed", async () => {
    const server = fakeRecordsServer();
    const app = await setup(server, [imported("a")], {
      providers: [],
      classifierId: "test-agent",
    });
    expect(app.customContent.classifier.value).toBeNull();
    await waitForCondition(
      () => !!stored(server, app.recordName, "a").classification
    );
    expect(
      stored(server, app.recordName, "a").classification?.providerId
    ).toBeUndefined();
  });
});
