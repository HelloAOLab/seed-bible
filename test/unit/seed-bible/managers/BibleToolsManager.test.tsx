import { signal } from "@preact/signals";

vi.mock("@packages/seed-bible/seed-bible/components/icons", () => ({
  MaterialIcon: () => null,
  SeedBibleIcon: () => null,
  StopIcon: () => null,
  AskIcon: () => null,
}));

import {
  createBibleToolsManager,
  getShareUrl,
  type BibleToolContext,
  type QuickToolContext,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { formatSelectedVerses } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BrandingConfig } from "@packages/seed-bible/seed-bible/app/appConfig";
import { extractContentText } from "@packages/seed-bible/seed-bible/managers/ChapterText";

const CUSTOM_TOOL_ID = "test-toolbar-tool";
const CUSTOM_VERSE_TOOL_ID = "test-verse-toolbar-tool";
const CUSTOM_ITEMS_TOOL_ID = "test-toolbar-tool-items";
const testBranding: BrandingConfig = {
  appName: "Test App",
  shortName: "Test",
  logo: "",
  icon: "",
  websiteUrl: "https://example.com",
  disabledToolbarTools: [],
};

function createMockChats(overrides?: {
  providers?: Array<{ id: string; name?: string }>;
  chats?: unknown[];
  composerDraft?: string;
}) {
  const addParticipant = vi.fn();
  const createdChat = {
    id: "ask-ai-chat",
    addParticipant,
    participants: signal([]),
  };
  return {
    chats: signal(overrides?.chats ?? []),
    providers: signal(overrides?.providers ?? []),
    composerDraft: signal(overrides?.composerDraft ?? ""),
    createLocalSession: vi.fn(() => createdChat),
    selectChat: vi.fn(),
    createdChat,
    addParticipant,
  };
}

function createContext(
  overrides?: Partial<Omit<BibleToolContext, "chats">> & {
    chats?: ReturnType<typeof createMockChats>;
  }
): BibleToolContext {
  const { chats: chatsOverride, ...rest } = overrides ?? {};
  const chats = chatsOverride ?? createMockChats();
  return {
    readingState: {
      chapterData: signal(null),
      loading: signal(false),
      selectedVerses: signal([]),
      clearSelectedVerses: vi.fn(),
      loadPreviousChapter: vi.fn(),
      loadNextChapter: vi.fn(),
      hasNext: signal(false),
      hasPrevious: signal(false),
    } as any,
    sharedSession: null,
    selectorState: {
      setOpen: vi.fn(),
    } as any,
    openSidebar: vi.fn(),
    openSearch: vi.fn(),
    openChat: vi.fn(),
    panesManager: {} as any,
    tabsLayoutManager: {
      slots: signal([]),
      layout: signal("single"),
      selectedSlotId: signal(null),
      selectSlot: vi.fn(),
      setLayout: vi.fn(),
      setSelectedSlotTab: vi.fn(),
      openTabInSlot: vi.fn(),
      openTabInNewSlot: vi.fn(),
      closeSlot: vi.fn(),
    } as any,
    tabs: {} as any,
    toast: vi.fn(),
    chats: chats as any,
    features: {
      isFeatureEnabled: vi.fn(() => signal(true)),
    },
    ...rest,
  };
}

function createShareUrlReadingState(overrides?: Partial<BibleReadingState>) {
  return {
    translation: signal({ id: "NIV" }),
    bookId: signal("GEN"),
    chapterNumber: signal(1),
    selectedVerses: signal([]),
    ...overrides,
  };
}

describe("getShareUrl", () => {
  beforeEach(() => {
    jsdom.reconfigure({
      url: "https://example.test/reader?existing=1",
    });
  });

  it("builds a share URL with the current translation, book, chapter, and selected verses", () => {
    const readingState = createShareUrlReadingState({
      selectedVerses: signal([
        {
          bookId: "GEN",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 3 },
        },
        {
          bookId: "GEN",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 1 },
        },
        {
          bookId: "EXO",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 9 },
        },
        {
          bookId: "GEN",
          chapterNumber: 2,
          translationId: "NIV",
          verse: { number: 8 },
        },
      ] as any),
    });

    const url = getShareUrl(readingState as any);

    // The position goes in the path. Handing out `?translation=&book=&chapter=`
    // would produce a link that opens whatever the *path* says instead, since
    // the path is what the app reads first.
    expect(url.toString()).toBe(
      "https://example.test/en/NIV/genesis/1?verse=1%2C3"
    );
  });

  it("builds supports consecutive verses", () => {
    const readingState = createShareUrlReadingState({
      selectedVerses: signal([
        {
          bookId: "GEN",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 3 },
        },
        {
          bookId: "GEN",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 2 },
        },
        {
          bookId: "GEN",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 1 },
        },
        {
          bookId: "EXO",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 9 },
        },
        {
          bookId: "GEN",
          chapterNumber: 2,
          translationId: "NIV",
          verse: { number: 8 },
        },
      ] as any),
    });

    const url = getShareUrl(readingState as any);

    expect(url.toString()).toBe(
      "https://example.test/en/NIV/genesis/1?verse=1-3"
    );
  });

  it("omits the verse query when no selected verses match the current book and chapter", () => {
    const readingState = createShareUrlReadingState({
      translation: signal(null),
      bookId: signal(null),
      selectedVerses: signal([
        {
          bookId: "EXO",
          chapterNumber: 1,
          translationId: "NIV",
          verse: { number: 4 },
        },
      ] as any),
      defaultTranslation: { id: "AAB", language: "en" },
    });

    const url = getShareUrl(readingState as any);

    // The language segment is always present — the 3-segment form is only a
    // redirect entry point, never something to hand out.
    expect(url.toString()).toBe("https://example.test/en/AAB/genesis/1");
  });

  it("keeps the reading position out of the query string entirely", () => {
    const url = getShareUrl(createShareUrlReadingState() as any);

    for (const stale of ["translation", "translationId", "book", "chapter"]) {
      expect(url.searchParams.has(stale)).toBe(false);
    }
  });

  it("preserves the language the reader is already on", () => {
    jsdom.reconfigure({ url: "https://example.test/es/spa_onbv/john/3" });

    const url = getShareUrl(
      createShareUrlReadingState({
        translation: signal({ id: "spa_onbv" }) as any,
        bookId: signal("JHN") as any,
        chapterNumber: signal(3) as any,
      }) as any
    );

    expect(url.toString()).toBe("https://example.test/es/spa_onbv/john/3");
  });
});

describe("createBibleToolsManager", () => {
  afterEach(() => {
    const manager = createBibleToolsManager(testBranding);
    manager.unregisterToolbarTool(CUSTOM_TOOL_ID);
    manager.unregisterToolbarTool(CUSTOM_ITEMS_TOOL_ID);
    manager.unregisterVerseToolbarTool(CUSTOM_VERSE_TOOL_ID);
  });

  it("registerToolbarTool() registers a toolbar tool", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerToolbarTool({
      id: CUSTOM_TOOL_ID,
      priority: 50,
      title: "Custom Tool",
      icon: () => <span>icon</span>,
      isVisible: () => true,
      isDisabled: () => false,
      onSelect: vi.fn(),
    });

    const tools = manager.getToolbarTools(context);

    expect(tools.some((tool) => tool.id === CUSTOM_TOOL_ID)).toBe(true);
  });

  it("unregisterToolbarTool() removes a toolbar tool", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerToolbarTool({
      id: CUSTOM_TOOL_ID,
      priority: 50,
      title: "Custom Tool",
      icon: () => <span>icon</span>,
      isVisible: () => true,
      onSelect: vi.fn(),
    });

    manager.unregisterToolbarTool(CUSTOM_TOOL_ID);

    const tools = manager.getToolbarTools(context);

    expect(tools.some((tool) => tool.id === CUSTOM_TOOL_ID)).toBe(false);
  });

  it("getToolbarTools() returns visible mapped tools", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerToolbarTool({
      id: CUSTOM_TOOL_ID,
      priority: 50,
      title: "Custom Tool",
      icon: () => <span>icon</span>,
      isVisible: () => true,
      isDisabled: () => true,
      onSelect: vi.fn(),
    });

    manager.registerToolbarTool({
      id: `${CUSTOM_TOOL_ID}-hidden`,
      priority: 60,
      title: "Hidden Tool",
      icon: () => <span>icon</span>,
      isVisible: () => false,
      onSelect: vi.fn(),
    });

    const tools = manager.getToolbarTools(context);

    const customTool = tools.find((tool) => tool.id === CUSTOM_TOOL_ID);
    const hiddenTool = tools.find(
      (tool) => tool.id === `${CUSTOM_TOOL_ID}-hidden`
    );
    expect(customTool).toBeDefined();
    expect(customTool?.visible.value).toBe(true);
    expect(customTool?.disabled.value).toBe(true);
    expect(hiddenTool).toBeDefined();
    expect(hiddenTool?.visible.value).toBe(false);

    manager.unregisterToolbarTool(`${CUSTOM_TOOL_ID}-hidden`);
  });

  it("getToolbarTools() supports signal results for visibility and disabled", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();
    const isVisible = signal(true);
    const isDisabled = signal(false);

    manager.registerToolbarTool({
      id: CUSTOM_TOOL_ID,
      priority: 50,
      title: "Custom Tool",
      icon: () => <span>icon</span>,
      isVisible: () => isVisible,
      isDisabled: () => isDisabled,
      onSelect: vi.fn(),
    });

    let tools = manager.getToolbarTools(context);
    expect(tools.some((tool) => tool.id === CUSTOM_TOOL_ID)).toBe(true);
    expect(
      tools.find((tool) => tool.id === CUSTOM_TOOL_ID)?.disabled.value
    ).toBe(false);

    isDisabled.value = true;
    tools = manager.getToolbarTools(context);
    expect(
      tools.find((tool) => tool.id === CUSTOM_TOOL_ID)?.disabled.value
    ).toBe(true);

    isVisible.value = false;
    tools = manager.getToolbarTools(context);
    expect(tools.some((tool) => tool.id === CUSTOM_TOOL_ID)).toBe(true);
    expect(
      tools.find((tool) => tool.id === CUSTOM_TOOL_ID)?.visible.value
    ).toBe(false);
  });
  it("omits tools listed in disabledToolbarTools", () => {
    const manager = createBibleToolsManager({
      ...testBranding,
      disabledToolbarTools: ["open-search", "share"],
    });

    const context = createContext();
    const ids = manager.getToolbarTools(context).map((tool) => tool.id);

    expect(ids).not.toContain("open-search");
    expect(ids).not.toContain("share");
    expect(ids).toContain("previous-chapter");
    expect(manager.listQuickTools().map((tool) => tool.id)).not.toContain(
      "share"
    );
  });

  it("keeps all default tools when disabledToolbarTools is empty", () => {
    const context = createContext();

    const withNone = createBibleToolsManager(testBranding);
    const withSome = createBibleToolsManager({
      ...testBranding,
      disabledToolbarTools: ["open-search"],
    });

    const withoutDisabled = withNone.getToolbarTools(context);
    const withDisabled = withSome.getToolbarTools(context);

    expect(withoutDisabled.length).toBe(withDisabled.length + 1);
  });

  it("registerVerseToolbarTool() registers a verse toolbar tool", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerVerseToolbarTool({
      id: CUSTOM_VERSE_TOOL_ID,
      priority: 10,
      title: "Custom Verse Tool",
      icon: () => <span>icon</span>,
      isVisible: () => true,
      isDisabled: () => false,
      onSelect: vi.fn(),
    });

    const tools = manager.getVerseToolbarTools(context);

    expect(tools.some((tool) => tool.id === CUSTOM_VERSE_TOOL_ID)).toBe(true);
  });

  it("unregisterVerseToolbarTool() removes a verse toolbar tool", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerVerseToolbarTool({
      id: CUSTOM_VERSE_TOOL_ID,
      priority: 10,
      title: "Custom Verse Tool",
      icon: () => <span>icon</span>,
      isVisible: () => true,
      onSelect: vi.fn(),
    });

    manager.unregisterVerseToolbarTool(CUSTOM_VERSE_TOOL_ID);

    const tools = manager.getVerseToolbarTools(context);

    expect(tools.some((tool) => tool.id === CUSTOM_VERSE_TOOL_ID)).toBe(false);
  });

  it("getVerseToolbarTools() returns visible mapped tools", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerVerseToolbarTool({
      id: CUSTOM_VERSE_TOOL_ID,
      priority: 10,
      title: "Custom Verse Tool",
      icon: () => <span>icon</span>,
      isVisible: () => true,
      isDisabled: () => true,
      onSelect: vi.fn(),
    });

    manager.registerVerseToolbarTool({
      id: `${CUSTOM_VERSE_TOOL_ID}-hidden`,
      priority: 11,
      title: "Hidden Verse Tool",
      icon: () => <span>icon</span>,
      isVisible: () => false,
      onSelect: vi.fn(),
    });

    const tools = manager.getVerseToolbarTools(context);

    const customTool = tools.find((tool) => tool.id === CUSTOM_VERSE_TOOL_ID);
    const hiddenTool = tools.find(
      (tool) => tool.id === `${CUSTOM_VERSE_TOOL_ID}-hidden`
    );
    expect(customTool).toBeDefined();
    expect(customTool?.visible.value).toBe(true);
    expect(customTool?.disabled.value).toBe(true);
    expect(hiddenTool).toBeDefined();
    expect(hiddenTool?.visible.value).toBe(false);

    manager.unregisterVerseToolbarTool(`${CUSTOM_VERSE_TOOL_ID}-hidden`);
  });

  it("getToolbarTools() resolves getItems() in declared order", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();
    const firstItemOnSelect = vi.fn();
    const secondItemOnSelect = vi.fn();

    manager.registerToolbarTool({
      id: CUSTOM_ITEMS_TOOL_ID,
      priority: 50,
      title: "Custom Items Tool",
      icon: () => <span>icon</span>,
      getItems: () => [
        {
          id: "first-item",
          title: "First",
          icon: () => <span>first</span>,
          onSelect: firstItemOnSelect,
        },
        {
          id: "second-item",
          title: "Second",
          icon: () => <span>second</span>,
          onSelect: secondItemOnSelect,
        },
      ],
    });

    const tool = manager
      .getToolbarTools(context)
      .find((entry) => entry.id === CUSTOM_ITEMS_TOOL_ID);
    const items = tool?.getItems?.();

    expect(tool).toBeDefined();
    expect(items).toBeDefined();
    expect(items?.map((item) => item.id)).toEqual([
      "first-item",
      "second-item",
    ]);

    items?.[0]!.onSelect();
    items?.[1]!.onSelect();

    expect(firstItemOnSelect).toHaveBeenCalledTimes(1);
    expect(secondItemOnSelect).toHaveBeenCalledTimes(1);
  });

  it("registerToolbarTool() throws when both onSelect() and getItems() are provided", () => {
    const manager = createBibleToolsManager(testBranding);

    expect(() => {
      manager.registerToolbarTool({
        id: CUSTOM_ITEMS_TOOL_ID,
        priority: 50,
        title: "Custom Items Tool",
        icon: () => <span>icon</span>,
        onSelect: vi.fn(),
        getItems: () => [],
      });
    }).toThrow(
      `Tool "${CUSTOM_ITEMS_TOOL_ID}" cannot define both onSelect() and getItems().`
    );
  });

  it("tool getItems() throws when an item defines nested getItems()", () => {
    const manager = createBibleToolsManager(testBranding);
    const context = createContext();

    manager.registerToolbarTool({
      id: CUSTOM_ITEMS_TOOL_ID,
      priority: 50,
      title: "Custom Items Tool",
      icon: () => <span>icon</span>,
      getItems: () =>
        [
          {
            id: "nested-item",
            title: "Nested",
            icon: () => <span>nested</span>,
            onSelect: vi.fn(),
            getItems: () => [],
          },
        ] as any,
    });

    const tool = manager
      .getToolbarTools(context)
      .find((entry) => entry.id === CUSTOM_ITEMS_TOOL_ID);

    expect(() => tool?.getItems?.()).toThrow(
      `Tool item "nested-item" in "${CUSTOM_ITEMS_TOOL_ID}" cannot define getItems().`
    );
  });

  describe("copy-verse / share-verse formatting", () => {
    function createVerseContext(
      overrides?: Partial<BibleReadingState>
    ): BibleToolContext {
      return {
        ...createContext(),
        modals: {
          openModal: vi.fn().mockReturnValue("modal-1"),
          closeModal: vi.fn(),
        } as any,
        app: {} as any,
        readingState: {
          chapterData: signal({
            book: { id: "PSA", name: "Psalms" },
          }),
          loading: signal(false),
          translation: signal({ id: "NIV" }),
          bookId: signal("PSA"),
          chapterNumber: signal(2),
          selectedVerses: signal([
            {
              bookId: "PSA",
              chapterNumber: 2,
              translationId: "NIV",
              verse: {
                number: 2,
                content: [
                  "The kings of the earth take their stand ",
                  "and the rulers gather together, ",
                  "against the LORD ",
                  "and against His Anointed One:",
                ],
              },
            },
          ]),
          clearSelectedVerses: vi.fn(),
          loadPreviousChapter: vi.fn(),
          loadNextChapter: vi.fn(),
          ...overrides,
        } as any,
      };
    }

    beforeEach(() => {
      (window.navigator as any).clipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      (window.navigator as any).share = vi.fn();
    });

    it("copy-verse uses the full book name instead of the book ID", async () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createVerseContext();

      const tool = manager
        .getVerseToolbarTools(context)
        .find((t) => t.id === "copy-verse");

      await tool?.onSelect();

      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        "The kings of the earth take their stand and the rulers gather together, against the LORD and against His Anointed One: (Psalms 2:2)"
      );
    });

    it("copy-verse falls back to the book ID when chapter data is unavailable", async () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createVerseContext({
        chapterData: signal(null),
      });

      const tool = manager
        .getVerseToolbarTools(context)
        .find((t) => t.id === "copy-verse");

      await tool?.onSelect();

      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("(PSA 2:2)")
      );
    });

    it("copy-verse collapses whitespace around non-text parts and poem FormattedText", async () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createVerseContext({
        chapterData: signal({
          book: { id: "GEN", name: "Genesis" },
        } as BibleReadingState["chapterData"]["value"]),
        selectedVerses: signal([
          {
            bookId: "GEN",
            chapterNumber: 1,
            translationId: "BSB",
            verse: {
              type: "verse",
              number: 1,
              content: [
                "In the beginning ",
                { text: "I am the light", wordsOfJesus: true },
                { lineBreak: true },
                { noteId: 7 },
                "God created.",
              ],
            },
          },
          {
            bookId: "GEN",
            chapterNumber: 1,
            translationId: "BSB",
            verse: {
              type: "verse",
              number: 2,
              content: [
                { text: "Poetry A", poem: 2 },
                { lineBreak: true },
                { text: "Poetry B", poem: 1 },
              ],
            },
          },
        ]),
      });

      const tool = manager
        .getVerseToolbarTools(context)
        .find((t) => t.id === "copy-verse");

      await tool?.onSelect();

      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(
        "In the beginning I am the light God created. Poetry A Poetry B (Genesis 1:1-2)"
      );
    });

    it("share-verse uses the full book name instead of the book ID", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createVerseContext();

      const tool = manager
        .getVerseToolbarTools(context)
        .find((t) => t.id === "share-verse");

      tool?.onSelect();

      const openModal = (context.modals as any).openModal;
      expect(openModal).toHaveBeenCalledTimes(1);

      const shareModal = openModal.mock.calls[0][0].content();
      shareModal.props.onShareVia();

      expect(window.navigator.share).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("(Psalms 2:2)"),
        })
      );
      expect(window.navigator.share).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.not.stringContaining("(PSA 2:2)"),
        })
      );
    });
  });

  describe("ask-ai verse tool", () => {
    const selectedVerse = {
      bookId: "PSA",
      chapterNumber: 2,
      translationId: "NIV",
      verse: {
        number: 2,
        content: [
          "The kings of the earth take their stand ",
          "and the rulers gather together, ",
          "against the LORD ",
          "and against His Anointed One:",
        ],
      },
    };

    function createAskAiContext(
      chats: ReturnType<typeof createMockChats>,
      readingOverrides?: Record<string, unknown>
    ) {
      return {
        ...createContext({ chats }),
        readingState: {
          chapterData: signal({
            book: { id: "PSA", name: "Psalms" },
          }),
          loading: signal(false),
          translation: signal({ id: "NIV", shortName: "NIV" }),
          bookId: signal("PSA"),
          chapterNumber: signal(2),
          selectedVerses: signal([selectedVerse]),
          clearSelectedVerses: vi.fn(),
          loadPreviousChapter: vi.fn(),
          loadNextChapter: vi.fn(),
          ...readingOverrides,
        } as any,
      };
    }

    function getAskAiTool(context: ReturnType<typeof createAskAiContext>) {
      return createBibleToolsManager(testBranding)
        .getVerseToolbarTools(context)
        .find((tool) => tool.id === "ask-ai");
    }

    it("is listed among verse toolbar tools", () => {
      const manager = createBibleToolsManager(testBranding);
      const listed = manager.listVerseToolbarTools();
      expect(listed.some((tool) => tool.id === "ask-ai")).toBe(true);
      expect(listed.find((tool) => tool.id === "ask-ai")?.title).toEqual({
        key: "ask-ai",
        defaultValue: "Ask AI",
      });
    });

    it("is hidden when no AI providers are registered", () => {
      const context = createAskAiContext(createMockChats());
      expect(getAskAiTool(context)?.visible.value).toBe(false);
    });

    it("is hidden when no verses are selected, even if providers exist", () => {
      const context = createAskAiContext(
        createMockChats({
          providers: [{ id: "apologist", name: "Apologist" }],
        }),
        { selectedVerses: signal([]) }
      );
      expect(getAskAiTool(context)?.visible.value).toBe(false);
    });

    it("is visible when verses are selected and at least one provider exists", () => {
      const context = createAskAiContext(
        createMockChats({ providers: [{ id: "apologist", name: "Apologist" }] })
      );
      expect(getAskAiTool(context)?.visible.value).toBe(true);
    });

    it("returns no picker items when only one agent is available", () => {
      const context = createAskAiContext(
        createMockChats({ providers: [{ id: "apologist", name: "Apologist" }] })
      );
      expect(getAskAiTool(context)?.getItems?.()).toEqual([]);
    });

    it("opens a chat for the only available agent, prefills verses with two newlines, and clears the selection", async () => {
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
      });
      const context = createAskAiContext(chats);
      const openChat = vi.fn();
      context.openChat = openChat;

      getAskAiTool(context)?.onSelect();
      await Promise.resolve();

      expect(chats.createLocalSession).toHaveBeenCalledTimes(1);
      expect(chats.addParticipant).toHaveBeenCalledWith("apologist");
      expect(chats.selectChat).toHaveBeenCalledWith("ask-ai-chat");
      expect(openChat).toHaveBeenCalledTimes(1);
      expect(chats.composerDraft.value).toBe(
        `${formatSelectedVerses(context.readingState)}\n\n`
      );
      expect(context.readingState.clearSelectedVerses).toHaveBeenCalledTimes(1);
    });

    it("does nothing when the single-agent shortcut is invoked with no selected verses", () => {
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
      });
      const context = createAskAiContext(chats, {
        selectedVerses: signal([]),
      });

      getAskAiTool(context)?.onSelect();

      expect(chats.createLocalSession).not.toHaveBeenCalled();
      expect(chats.selectChat).not.toHaveBeenCalled();
      expect(chats.composerDraft.value).toBe("");
      expect(context.readingState.clearSelectedVerses).not.toHaveBeenCalled();
    });

    it("does nothing when the single-agent shortcut is invoked with multiple agents", () => {
      const chats = createMockChats({
        providers: [
          { id: "apologist", name: "Apologist" },
          { id: "scholar", name: "Scholar" },
        ],
      });
      const context = createAskAiContext(chats);

      getAskAiTool(context)?.onSelect();

      expect(chats.createLocalSession).not.toHaveBeenCalled();
      expect(chats.selectChat).not.toHaveBeenCalled();
    });

    it("does nothing when the only provider disappears before the tool is used", () => {
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
      });
      const context = createAskAiContext(chats);
      const tool = getAskAiTool(context);
      chats.providers.value = [];

      tool?.onSelect();

      expect(chats.createLocalSession).not.toHaveBeenCalled();
      expect(chats.composerDraft.value).toBe("");
    });

    it("lists each available agent when more than one is registered", () => {
      const context = createAskAiContext(
        createMockChats({
          providers: [
            { id: "apologist", name: "Apologist" },
            { id: "scholar", name: "Scholar" },
          ],
        })
      );

      const items = getAskAiTool(context)?.getItems?.() ?? [];
      expect(items.map((item) => item.id)).toEqual([
        "ask-ai-apologist",
        "ask-ai-scholar",
      ]);
      expect(items.map((item) => item.title)).toEqual(["Apologist", "Scholar"]);
    });

    it("opens a chat for the agent chosen from the picker", async () => {
      const chats = createMockChats({
        providers: [
          { id: "apologist", name: "Apologist" },
          { id: "scholar", name: "Scholar" },
        ],
      });
      const context = createAskAiContext(chats);
      const openChat = vi.fn();
      context.openChat = openChat;

      const scholarItem = getAskAiTool(context)
        ?.getItems?.()
        .find((item) => item.id === "ask-ai-scholar");
      scholarItem?.onSelect();
      await Promise.resolve();

      expect(chats.createLocalSession).toHaveBeenCalledTimes(1);
      expect(chats.addParticipant).toHaveBeenCalledWith("scholar");
      expect(chats.addParticipant).not.toHaveBeenCalledWith("apologist");
      expect(chats.selectChat).toHaveBeenCalledWith("ask-ai-chat");
      expect(openChat).toHaveBeenCalledTimes(1);
      expect(chats.composerDraft.value).toBe(
        `${formatSelectedVerses(context.readingState)}\n\n`
      );
    });

    it("does nothing if the chosen provider is removed before the picker item is used", () => {
      const chats = createMockChats({
        providers: [
          { id: "apologist", name: "Apologist" },
          { id: "scholar", name: "Scholar" },
        ],
      });
      const context = createAskAiContext(chats);
      const scholarItem = getAskAiTool(context)
        ?.getItems?.()
        .find((item) => item.id === "ask-ai-scholar");

      chats.providers.value = [{ id: "apologist", name: "Apologist" } as any];
      scholarItem?.onSelect();

      expect(chats.createLocalSession).not.toHaveBeenCalled();
      expect(chats.composerDraft.value).toBe("");
    });

    it("reuses the most recent local chat that already includes the chosen agent", async () => {
      const addParticipant = vi.fn();
      const olderChat = {
        id: "older-apologist-chat",
        addParticipant: vi.fn(),
        participants: signal([
          { isSelf: true, isAI: false, isRemote: false },
          { isAI: true, isRemote: false, providerId: "apologist" },
        ]),
      };
      const recentChat = {
        id: "recent-apologist-chat",
        addParticipant,
        participants: signal([
          { isSelf: true, isAI: false, isRemote: false },
          { isAI: true, isRemote: false, providerId: "apologist" },
        ]),
      };
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
        chats: [olderChat, recentChat],
      });
      const context = createAskAiContext(chats);

      getAskAiTool(context)?.onSelect();
      await Promise.resolve();

      expect(chats.createLocalSession).not.toHaveBeenCalled();
      expect(addParticipant).toHaveBeenCalledWith("apologist");
      expect(chats.selectChat).toHaveBeenCalledWith("recent-apologist-chat");
      expect(context.readingState.clearSelectedVerses).toHaveBeenCalledTimes(1);
    });

    it("does not reuse a shared chat or a local chat for a different agent", async () => {
      const sharedChat = {
        id: "shared-chat",
        addParticipant: vi.fn(),
        participants: signal([
          { isSelf: true, isAI: false, isRemote: false },
          { isAI: true, isRemote: true, providerId: "apologist" },
        ]),
      };
      const otherAgentChat = {
        id: "scholar-chat",
        addParticipant: vi.fn(),
        participants: signal([
          { isSelf: true, isAI: false, isRemote: false },
          { isAI: true, isRemote: false, providerId: "scholar" },
        ]),
      };
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
        chats: [sharedChat, otherAgentChat],
      });
      const context = createAskAiContext(chats);

      getAskAiTool(context)?.onSelect();
      await Promise.resolve();

      expect(chats.createLocalSession).toHaveBeenCalledTimes(1);
      expect(chats.selectChat).toHaveBeenCalledWith("ask-ai-chat");
      expect(sharedChat.addParticipant).not.toHaveBeenCalled();
      expect(otherAgentChat.addParticipant).not.toHaveBeenCalled();
    });

    it("still creates the chat and prefills the draft when openChat is missing", async () => {
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
      });
      const context = createAskAiContext(chats);
      delete (context as { openChat?: unknown }).openChat;

      getAskAiTool(context)?.onSelect();
      await Promise.resolve();

      expect(chats.createLocalSession).toHaveBeenCalledTimes(1);
      expect(chats.selectChat).toHaveBeenCalledWith("ask-ai-chat");
      expect(chats.composerDraft.value).toContain("\n\n");
    });

    it("does not throw when the chats mock is missing createLocalSession and composerDraft", () => {
      const context = createAskAiContext({
        chats: signal([]),
        providers: signal([{ id: "apologist", name: "Apologist" }]),
        selectChat: vi.fn(),
      } as any);

      expect(() => getAskAiTool(context)?.onSelect()).not.toThrow();
    });

    it("prefills consecutive verses as one block, then two newlines", () => {
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
      });
      const context = createAskAiContext(chats, {
        selectedVerses: signal([
          {
            bookId: "GEN",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 1,
              content: [
                "In the beginning God created the heavens and the earth.",
              ],
            },
          },
          {
            bookId: "GEN",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 2,
              content: ["Now the earth was formless and empty."],
            },
          },
        ]),
        chapterData: signal({ book: { id: "GEN", name: "Genesis" } }),
        translation: signal({ shortName: "NIV" }),
      });

      getAskAiTool(context)?.onSelect();

      expect(chats.composerDraft.value).toBe(
        "In the beginning God created the heavens and the earth. Now the earth was formless and empty. (Genesis 1:1-2 NIV)\n\n"
      );
    });

    it("keeps blank lines between non-consecutive verse groups and still adds two trailing newlines", () => {
      const chats = createMockChats({
        providers: [{ id: "apologist", name: "Apologist" }],
      });
      const context = createAskAiContext(chats, {
        selectedVerses: signal([
          {
            bookId: "GEN",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 1,
              content: [
                "In the beginning God created the heavens and the earth.",
              ],
            },
          },
          {
            bookId: "GEN",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 3,
              content: ["And God said, Let there be light."],
            },
          },
        ]),
        chapterData: signal({ book: { id: "GEN", name: "Genesis" } }),
        translation: signal({ shortName: "NIV" }),
      });

      getAskAiTool(context)?.onSelect();

      expect(chats.composerDraft.value).toBe(
        "In the beginning God created the heavens and the earth. (Genesis 1:1 NIV)\n\nAnd God said, Let there be light. (Genesis 1:3 NIV)\n\n"
      );
    });
  });

  describe("formatSelectedVerses", () => {
    function createReadingState(
      selectedVerses: any[],
      overrides?: Partial<BibleReadingState>
    ) {
      return {
        selectedVerses: signal(selectedVerses),
        chapterData: signal({
          book: {
            id: "GEN",
            name: "Genesis",
          },
        } as BibleReadingState["chapterData"]["value"]),
        translation: signal({
          shortName: "NIV",
        }),
        ...overrides,
      } as BibleReadingState;
    }

    it("formats a single verse with the reference at the end", () => {
      const state = createReadingState([
        {
          bookId: "GEN",
          chapterNumber: 1,
          verse: {
            type: "verse",
            number: 1,
            content: [
              "In the beginning God created the heavens and the earth.",
            ],
          },
        },
      ]);

      expect(formatSelectedVerses(state)).toBe(
        "In the beginning God created the heavens and the earth. (Genesis 1:1 NIV)"
      );
    });

    it("formats three consecutive verses with one reference", () => {
      const state = createReadingState([
        {
          bookId: "GEN",
          chapterNumber: 2,
          verse: {
            type: "verse",
            number: 4,
            content: [
              "This is the account of the heavens and the earth when they were created.",
            ],
          },
        },
        {
          bookId: "GEN",
          chapterNumber: 2,
          verse: {
            type: "verse",
            number: 5,
            content: [
              "Now no shrub of the field had yet appeared on the earth.",
            ],
          },
        },
        {
          bookId: "GEN",
          chapterNumber: 2,
          verse: {
            type: "verse",
            number: 6,
            content: [
              "But springs welled up from the earth and watered the whole surface of the ground.",
            ],
          },
        },
      ]);

      expect(formatSelectedVerses(state)).toBe(
        "This is the account of the heavens and the earth when they were created. Now no shrub of the field had yet appeared on the earth. But springs welled up from the earth and watered the whole surface of the ground. (Genesis 2:4-6 NIV)"
      );
    });

    it("formats non-consecutive verses into separate groups", () => {
      const state = createReadingState([
        {
          bookId: "GEN",
          chapterNumber: 2,
          verse: {
            type: "verse",
            number: 4,
            content: [
              "This is the account of the heavens and the earth when they were created.",
            ],
          },
        },
        {
          bookId: "GEN",
          chapterNumber: 2,
          verse: {
            type: "verse",
            number: 8,
            content: [
              "And the LORD God planted a garden in Eden, in the east, where He placed the man He had formed.",
            ],
          },
        },
      ]);

      expect(formatSelectedVerses(state)).toBe(
        "This is the account of the heavens and the earth when they were created. (Genesis 2:4 NIV)\n\nAnd the LORD God planted a garden in Eden, in the east, where He placed the man He had formed. (Genesis 2:8 NIV)"
      );
    });

    it("formats poem lines like regular text", () => {
      const state = createReadingState(
        [
          {
            bookId: "PSA",
            chapterNumber: 23,
            verse: {
              type: "verse",
              number: 1,
              content: [
                { text: "The LORD is my shepherd,", poem: 1 },
                { lineBreak: true },
                { text: "I shall not want.", poem: 2 },
              ],
            },
          },
        ],
        {
          chapterData: signal({
            book: {
              id: "PSA",
              name: "Psalms",
            },
          } as BibleReadingState["chapterData"]["value"]),
        }
      );

      expect(formatSelectedVerses(state)).toBe(
        "The LORD is my shepherd, I shall not want. (Psalms 23:1 NIV)"
      );
    });

    it("does not introduce extra or missing spaces for poem lines", () => {
      const state = createReadingState(
        [
          {
            bookId: "PSA",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 1,
              content: [
                "Blessed ",
                { text: "is the man", poem: 1 },
                { lineBreak: true },
                { text: "who walks not.", poem: 2 },
              ],
            },
          },
        ],
        {
          chapterData: signal({
            book: {
              id: "PSA",
              name: "Psalms",
            },
          } as BibleReadingState["chapterData"]["value"]),
        }
      );

      expect(formatSelectedVerses(state)).toBe(
        "Blessed is the man who walks not. (Psalms 1:1 NIV)"
      );
    });

    it("formats non-English text correctly", () => {
      const state = createReadingState(
        [
          {
            bookId: "GEN",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 1,
              content: ["En el principio creó Dios los cielos y la tierra."],
            },
          },
        ],
        {
          chapterData: signal({
            book: {
              id: "GEN",
              name: "Génesis",
            },
          } as BibleReadingState["chapterData"]["value"]),
          translation: signal({
            shortName: "NIV",
          } as BibleReadingState["translation"]["value"]),
        }
      );

      expect(formatSelectedVerses(state)).toBe(
        "En el principio creó Dios los cielos y la tierra. (Génesis 1:1 NIV)"
      );
    });

    it("formats RTL languages correctly", () => {
      const state = createReadingState(
        [
          {
            bookId: "GEN",
            chapterNumber: 1,
            verse: {
              type: "verse",
              number: 1,
              content: [
                "فِي الْبَدْءِ خَلَقَ اللَّهُ السَّمَاوَاتِ وَالْأَرْضَ.",
              ],
            },
          },
        ],
        {
          chapterData: signal({
            book: {
              id: "GEN",
              name: "التكوين",
            },
          } as BibleReadingState["chapterData"]["value"]),
          translation: signal({
            shortName: "NIV",
          } as BibleReadingState["translation"]["value"]),
        }
      );

      expect(formatSelectedVerses(state)).toBe(
        "فِي الْبَدْءِ خَلَقَ اللَّهُ السَّمَاوَاتِ وَالْأَرْضَ. (التكوين 1:1 NIV)"
      );
    });

    it("returns an empty string when there are no selected verses", () => {
      const state = createReadingState([]);

      expect(formatSelectedVerses(state)).toBe("");
    });
  });

  describe("extractVerseContentText", () => {
    it("joins plain strings and formatted text", () => {
      expect(
        extractContentText([
          "In the beginning",
          { text: "was the Word", wordsOfJesus: true },
        ])
      ).toBe("In the beginning was the Word");
    });

    it("drops parts that carry no text of their own", () => {
      expect(
        extractContentText([
          "Jesus wept",
          { noteId: 0 },
          { lineBreak: true },
        ] as never)
      ).toBe("Jesus wept");
    });

    it("collapses whitespace and tightens spacing before punctuation", () => {
      expect(extractContentText(["Hello", ",", "world", "."])).toBe(
        "Hello, world."
      );
    });

    it("returns an empty string for empty content", () => {
      expect(extractContentText([])).toBe("");
    });
  });

  describe("open-chat tool visibility", () => {
    it("is invisible when there are no providers and no chats", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-chat");

      expect(tool).toBeDefined();
      expect(tool?.visible.value).toBe(false);
    });

    it("is visible when there are providers", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createContext({
        chats: createMockChats({ providers: [{ id: "provider-1" }] }),
      });

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-chat");

      expect(tool).toBeDefined();
      expect(tool?.visible.value).toBe(true);
    });

    it("is visible when there are chats", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createContext({
        chats: createMockChats({ chats: [{ id: "chat-1" }] }),
      });

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-chat");

      expect(tool).toBeDefined();
      expect(tool?.visible.value).toBe(true);
    });
  });

  describe("chapter navigation tools stay enabled while loading (#1414)", () => {
    function createNavigableContext(): ReturnType<typeof createContext> {
      const context = createContext();
      (context.readingState as any).chapterData = signal({
        previousChapterApiLink: "/api/AAB/GEN/1.json",
        nextChapterApiLink: "/api/AAB/GEN/3.json",
      });
      (context.readingState as any).hasNext = signal(true);
      (context.readingState as any).hasPrevious = signal(true);
      // Replaced rather than assigned to: `loading` is a `ReadonlySignal`
      // derived from the in-flight request count, so it has no setter.
      (context.readingState as any).loading = signal(true);
      return context;
    }

    it("does not disable previous-chapter while a request is in flight", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createNavigableContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "previous-chapter");

      expect(tool).toBeDefined();
      expect(tool?.disabled.value).toBe(false);
    });

    it("does not disable next-chapter while a request is in flight", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createNavigableContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "next-chapter");

      expect(tool).toBeDefined();
      expect(tool?.disabled.value).toBe(false);
    });

    it("does not disable open-selector while a request is in flight", () => {
      const manager = createBibleToolsManager(testBranding);
      const context = createNavigableContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-selector");

      expect(tool).toBeDefined();
      expect(tool?.disabled.value).toBe(false);
    });
  });

  describe("share tool surfaces", () => {
    function createShareToolbarContext(
      overrides?: Partial<BibleToolContext>
    ): BibleToolContext {
      return {
        ...createContext(),
        modals: {
          openModal: vi.fn().mockReturnValue("modal-1"),
          closeModal: vi.fn(),
        } as any,
        app: {} as any,
        ...overrides,
      };
    }

    function createQuickContext(
      overrides?: Partial<QuickToolContext>
    ): QuickToolContext {
      return {
        readingState: {
          translation: signal({ id: "NIV" }),
          bookId: signal("GEN"),
          chapterNumber: signal(1),
          selectedVerses: signal([]),
        } as any,
        playlists: {
          playing: signal(null),
          isMobile: signal(false),
        } as any,
        features: {} as any,
        surface: "quick-toolbar",
        ...overrides,
      };
    }

    it("hides Share on the main toolbar", () => {
      const manager = createBibleToolsManager(testBranding);
      const ids = manager
        .getToolbarTools(
          createShareToolbarContext({ window: { isMobile: false } })
        )
        .map((entry) => entry.id);

      expect(ids).not.toContain("share");
    });

    it("shows Share on the quick toolbar on desktop and mobile", () => {
      const manager = createBibleToolsManager(testBranding);
      const isMobile = signal(false);
      const context = createQuickContext({
        playlists: {
          playing: signal(null),
          isMobile,
        } as any,
        modals: { openModal: vi.fn(), closeModal: vi.fn() } as any,
        app: {} as any,
      });

      const tool = manager
        .getQuickTools(context)
        .find((entry) => entry.id === "share");

      expect(tool?.visible.value).toBe(true);

      isMobile.value = true;
      expect(tool?.visible.value).toBe(true);
    });

    it("hides quick-toolbar Share on the mobile navigation bar surface", () => {
      const manager = createBibleToolsManager(testBranding);
      const tool = manager
        .getQuickTools(
          createQuickContext({
            surface: "mobile-navigation-bar",
            playlists: {
              playing: signal(null),
              isMobile: signal(true),
            } as any,
            modals: { openModal: vi.fn(), closeModal: vi.fn() } as any,
            app: {} as any,
          })
        )
        .find((entry) => entry.id === "share");

      expect(tool?.visible.value).toBe(false);
    });

    it("opens the share sheet from the quick-toolbar Share button", () => {
      const manager = createBibleToolsManager(testBranding);
      const openModal = vi.fn().mockReturnValue("modal-1");
      const tool = manager
        .getQuickTools(
          createQuickContext({
            playlists: {
              playing: signal(null),
              isMobile: signal(true),
            } as any,
            modals: { openModal, closeModal: vi.fn() } as any,
            app: {} as any,
          })
        )
        .find((entry) => entry.id === "share");

      tool?.onSelect();

      expect(openModal).toHaveBeenCalledTimes(1);
      expect(openModal.mock.calls[0]?.[0]?.title).toEqual({
        key: "share-sheet-title",
        defaultValue: "Share",
      });
    });
  });
});
