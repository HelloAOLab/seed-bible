import { signal } from "@preact/signals";

vi.mock("@packages/seed-bible/seed-bible/components/icons", () => ({
  MaterialIcon: () => null,
  SeedBibleIcon: () => null,
}));

import {
  createBibleToolsManager,
  getShareUrl,
  type BibleToolContext,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { formatSelectedVerses } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";

const CUSTOM_TOOL_ID = "test-toolbar-tool";
const CUSTOM_VERSE_TOOL_ID = "test-verse-toolbar-tool";
const CUSTOM_ITEMS_TOOL_ID = "test-toolbar-tool-items";

function createContext(): BibleToolContext {
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
    chats: {
      chats: signal([]),
      providers: signal([]),
    } as any,
    features: {
      isFeatureEnabled: vi.fn(() => signal(true)),
    },
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
    const manager = createBibleToolsManager();
    manager.unregisterToolbarTool(CUSTOM_TOOL_ID);
    manager.unregisterToolbarTool(CUSTOM_ITEMS_TOOL_ID);
    manager.unregisterVerseToolbarTool(CUSTOM_VERSE_TOOL_ID);
  });

  it("registerToolbarTool() registers a toolbar tool", () => {
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();
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

  it("registerVerseToolbarTool() registers a verse toolbar tool", () => {
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();
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
    const manager = createBibleToolsManager();

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
    const manager = createBibleToolsManager();
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
      const manager = createBibleToolsManager();
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
      const manager = createBibleToolsManager();
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
      const manager = createBibleToolsManager();
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
      const manager = createBibleToolsManager();
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

  describe("open-chat tool visibility", () => {
    it("is invisible when there are no providers and no chats", () => {
      const manager = createBibleToolsManager();
      const context = createContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-chat");

      expect(tool).toBeDefined();
      expect(tool?.visible.value).toBe(false);
    });

    it("is visible when there are providers", () => {
      const manager = createBibleToolsManager();
      const context: ReturnType<typeof createContext> = {
        ...createContext(),
        chats: {
          chats: signal([]),
          providers: signal([{ id: "provider-1" }] as any),
        } as any,
      };

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-chat");

      expect(tool).toBeDefined();
      expect(tool?.visible.value).toBe(true);
    });

    it("is visible when there are chats", () => {
      const manager = createBibleToolsManager();
      const context: ReturnType<typeof createContext> = {
        ...createContext(),
        chats: {
          chats: signal([{ id: "chat-1" }] as any),
          providers: signal([]),
        } as any,
      };

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
      const manager = createBibleToolsManager();
      const context = createNavigableContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "previous-chapter");

      expect(tool).toBeDefined();
      expect(tool?.disabled.value).toBe(false);
    });

    it("does not disable next-chapter while a request is in flight", () => {
      const manager = createBibleToolsManager();
      const context = createNavigableContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "next-chapter");

      expect(tool).toBeDefined();
      expect(tool?.disabled.value).toBe(false);
    });

    it("does not disable open-selector while a request is in flight", () => {
      const manager = createBibleToolsManager();
      const context = createNavigableContext();

      const tool = manager
        .getToolbarTools(context)
        .find((t) => t.id === "open-selector");

      expect(tool).toBeDefined();
      expect(tool?.disabled.value).toBe(false);
    });
  });
});
