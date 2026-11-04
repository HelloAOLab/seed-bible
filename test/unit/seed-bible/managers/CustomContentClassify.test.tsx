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

/** A provider that answers only when the test lets it, to see how many are asked at once. */
function heldProvider() {
  const waiting: (() => void)[] = [];
  let inFlight = 0;
  let mostInFlight = 0;
  const { provider, classifyContent } = classifierProvider(
    () =>
      new Promise((resolve) => {
        inFlight++;
        mostInFlight = Math.max(mostInFlight, inFlight);
        waiting.push(() => {
          inFlight--;
          resolve({ categoryIds: [], passages: [] });
        });
      })
  );
  return {
    provider,
    classifyContent,
    waiting,
    mostInFlight: () => mostInFlight,
  };
}

describe("passages named in the content", () => {
  it("are found by themselves for imported items, without asking the AI", async () => {
    const server = fakeRecordsServer();
    const { provider, classifyContent } = classifierProvider(async () => ({
      categoryIds: [],
      passages: [],
    }));
    const app = await setup(server, [imported("a")], {
      providers: [provider],
      classifierId: "test-agent",
    });

    await waitForCondition(
      () => !!stored(server, app.recordName, "a").classification
    );
    expect(stored(server, app.recordName, "a")).toMatchObject({
      references: [
        {
          book: "JHN",
          chapter: 10,
          verse: 1,
          endVerse: 18,
          source: "explicit",
        },
      ],
      classification: { status: "done" },
    });
    expect(
      stored(server, app.recordName, "a").classification?.providerId
    ).toBeUndefined();
    expect(classifyContent).not.toHaveBeenCalled();
  });

  it("leave drafts and published items alone", async () => {
    const server = fakeRecordsServer();
    const app = await setup(server, [
      imported("draft", { status: "draft" }),
      imported("published", { status: "published" }),
      imported("review"),
    ]);
    await waitForCondition(
      () => !!stored(server, app.recordName, "review").classification
    );
    expect(
      stored(server, app.recordName, "draft").classification
    ).toBeUndefined();
    expect(
      stored(server, app.recordName, "published").classification
    ).toBeUndefined();
  });
});

describe("asking the AI", () => {
  it("only happens when the owner asks, and saves its checked suggestions", async () => {
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
    const app = await setup(server, [imported("a")], {
      providers: [provider],
      classifierId: "test-agent",
    });
    sermonsId = app.sermons.id;
    await waitForCondition(
      () => !!stored(server, app.recordName, "a").classification
    );
    expect(classifyContent).not.toHaveBeenCalled();

    await app.customContent.classifyItem("a");

    expect(classifyContent.mock.calls[0]![0]).toMatchObject({
      knownPassages: ["John 10:1-18"],
      categories: [{ id: sermonsId, name: "Sermons" }],
    });
    const item = stored(server, app.recordName, "a");
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

  it("in bulk, covers every item waiting for review it hasn't been asked about, two at a time", async () => {
    const server = fakeRecordsServer();
    const held = heldProvider();
    const app = await setup(
      server,
      [
        ...["a", "b", "c"].map((id) => imported(id)),
        imported("asked", {
          classification: { status: "done", providerId: "test-agent", at: 1 },
        }),
        imported("draft", { status: "draft" }),
        imported("published", { status: "published" }),
      ],
      { providers: [held.provider], classifierId: "test-agent" }
    );
    expect(app.customContent.aiCandidates.value).toBe(3);

    const running = app.customContent.suggestWithAi();
    expect(app.customContent.aiRun.value).toMatchObject({
      total: 3,
      running: true,
    });
    for (let answered = 0; answered < 3; answered++) {
      await waitForCondition(() => held.waiting.length > 0);
      held.waiting.shift()!();
    }
    await running;

    expect(held.classifyContent).toHaveBeenCalledTimes(3);
    expect(
      held.classifyContent.mock.calls.map((call) => call[0].content.url)
    ).toEqual([
      "https://example.org/a",
      "https://example.org/b",
      "https://example.org/c",
    ]);
    expect(held.mostInFlight()).toBe(2);
    expect(app.customContent.aiRun.value).toEqual({
      total: 3,
      done: 3,
      failed: 0,
      running: false,
    });
    expect(app.customContent.aiCandidates.value).toBe(0);
  });

  it("can be stopped, after the items already being asked about", async () => {
    const server = fakeRecordsServer();
    const held = heldProvider();
    const app = await setup(
      server,
      ["a", "b", "c", "d"].map((id) => imported(id)),
      { providers: [held.provider], classifierId: "test-agent" }
    );

    const running = app.customContent.suggestWithAi();
    await waitForCondition(() => held.waiting.length === 2);
    app.customContent.stopSuggesting();
    held.waiting.splice(0).forEach((answer) => answer());
    await running;

    expect(held.classifyContent).toHaveBeenCalledTimes(2);
    // The two already asked finish and count; nothing after them starts.
    expect(app.customContent.aiRun.value).toMatchObject({
      total: 4,
      done: 2,
      running: false,
      stopping: true,
    });
    expect(app.customContent.aiCandidates.value).toBe(2);
  });

  it("records a failure on the item and doesn't retry it by itself", async () => {
    const server = fakeRecordsServer();
    const { provider, classifyContent } = classifierProvider(async () => {
      throw new Error("Agent unavailable");
    });
    const app = await setup(server, [imported("a")], {
      providers: [provider],
      classifierId: "test-agent",
    });

    await app.customContent.suggestWithAi();
    expect(stored(server, app.recordName, "a")).toMatchObject({
      references: [{ book: "JHN", source: "explicit" }],
      classification: { status: "failed", error: "Agent unavailable" },
    });
    expect(app.customContent.aiRun.value).toMatchObject({ done: 1, failed: 1 });
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

  it("publishes confident items without review only after the owner asks, when auto-publish is on", async () => {
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
        imported("sure", { title: "Sure", description: "Psalm 22" }),
        imported("unsure", { title: "Unsure", description: "" }),
      ],
      { providers: [provider], classifierId: "test-agent", autoPublish: true }
    );
    // Passages named in the content are found, but nothing is published
    // until the owner asks the AI.
    await waitForCondition(
      () => !!stored(server, app.recordName, "sure").classification
    );
    expect(stored(server, app.recordName, "sure").status).toBe("needs_review");

    await app.customContent.suggestWithAi();
    expect(stored(server, app.recordName, "sure").status).toBe("published");
    expect(stored(server, app.recordName, "unsure").status).toBe(
      "needs_review"
    );
    expect(
      server.records.get(app.recordName)!.has(contentChapterAddress("PSA", 23))
    ).toBe(true);
  });

  it("needs an agent chosen for the library", async () => {
    const server = fakeRecordsServer();
    const app = await setup(server, [imported("a")]);
    await expect(app.customContent.suggestWithAi()).rejects.toMatchObject({
      code: "no_classifier",
    });
  });

  it("isn't offered when the chosen agent's extension isn't installed", async () => {
    const server = fakeRecordsServer();
    const app = await setup(server, [imported("a")], {
      providers: [],
      classifierId: "test-agent",
    });
    expect(app.customContent.classifier.value).toBeNull();
    await expect(app.customContent.classifyItem("a")).rejects.toMatchObject({
      code: "no_classifier",
    });
  });
});
