import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleToolContext } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { createBibleToolsManager } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { createBibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import { FreeUseBibleAPI } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { ENDPOINT, useFetchMock } from "./harness";
import { createSettings } from "./settings";

const { default: initWordStudyExtension } =
  await import("@packages/word-study-extension/ext_WordStudy/init");
const { WORD_STUDY_PANE_ID } =
  await import("@packages/word-study-extension/ext_WordStudy/wordStudyState");
const { CHAPTER_INTERLINEAR_PANE_ID } =
  await import("@packages/word-study-extension/ext_WordStudy/chapterInterlinear");

useFetchMock();

function createContext() {
  const tools = createBibleToolsManager();
  const panes = createPanes();
  const readingState = {
    translationBooks: signal({ books: [{ id: "JHN", name: "John" }] }),
    selectedVerses: signal<BibleSelectedVerse[]>([]),
    visibleVerseRange: signal({ first: 5, last: 9 }),
  };
  const context = {
    tools,
    panes,
    bibleData: createBibleDataManager(new FreeUseBibleAPI(ENDPOINT)),
    extensionSettings: createSettings({ isSignedIn: false }),
    app: {
      openVerseReference: vi.fn().mockResolvedValue(undefined),
      currentReadingState: signal({
        translationId: "BSB",
        bookId: "JHN",
        chapterNumber: 1,
        tab: { readingState },
      }),
    },
  } as unknown as SeedBibleState;
  const register = vi.spyOn(tools, "registerVerseToolbarTool");
  const registerToolbar = vi.spyOn(tools, "registerToolbarTool");
  return { context, tools, panes, register, registerToolbar };
}

function install() {
  const harness = createContext();
  setupExtensionContext(harness.context);
  initWordStudyExtension();
  return harness;
}

function verse(number: number): BibleSelectedVerse {
  return {
    bookId: "JHN",
    chapterNumber: 1,
    verse: { type: "verse", number, content: [] },
    translationId: "BSB",
  };
}

function toolContext(selected: BibleSelectedVerse[]): BibleToolContext {
  return {
    readingState: {
      selectedVerses: signal(selected),
      translationBooks: signal({ books: [{ id: "JHN", name: "John" }] }),
    },
  } as unknown as BibleToolContext;
}

function hasWordStudyTool(tools: SeedBibleState["tools"]) {
  return tools.listVerseToolbarTools().some((tool) => tool.id === "word-study");
}

describe("initWordStudyExtension", () => {
  afterEach(() => {
    unregisterExtension("word-study-extension");
  });

  it("adds a Word Study tool that shows only with verses selected", () => {
    const { register } = install();

    const tool = register.mock.calls[0]![0];
    expect(tool.id).toBe("word-study");
    expect(tool.isVisible?.(toolContext([]))).toBe(false);
    expect(tool.isVisible?.(toolContext([verse(1)]))).toBe(true);
  });

  it("opens the pane on the selected verses", () => {
    const { register, panes } = install();
    const tool = register.mock.calls[0]![0];

    tool.onSelect?.(toolContext([verse(2), verse(1)]));

    expect(panes.panes.value.map((pane) => pane.id)).toEqual([
      WORD_STUDY_PANE_ID,
    ]);
    expect(panes.panes.value[0]?.placement).toBe("side");
  });

  it("removes its tool and closes its pane when uninstalled", () => {
    const { register, tools, panes } = install();
    register.mock.calls[0]![0].onSelect?.(toolContext([verse(1)]));

    unregisterExtension("word-study-extension");

    expect(hasWordStudyTool(tools)).toBe(false);
    expect(panes.panes.value).toEqual([]);
  });

  it("can be installed again after being uninstalled", () => {
    const { tools } = install();
    unregisterExtension("word-study-extension");

    initWordStudyExtension();

    expect(hasWordStudyTool(tools)).toBe(true);
  });

  it("adds an Interlinear tool that opens and closes the chapter view", () => {
    const { registerToolbar, tools, panes } = install();
    expect(tools.listToolbarTools().map((tool) => tool.id)).toContain(
      "word-study-interlinear"
    );
    const tool = registerToolbar.mock.calls[0]![0];

    tool.onSelect?.({} as BibleToolContext);

    expect(panes.panes.value.map((pane) => pane.id)).toEqual([
      CHAPTER_INTERLINEAR_PANE_ID,
    ]);
    expect(panes.panes.value[0]?.placement).toBe("side");

    tool.onSelect?.({} as BibleToolContext);

    expect(panes.panes.value).toEqual([]);
  });

  it("removes the Interlinear tool and closes its view when uninstalled", () => {
    const { registerToolbar, tools, panes } = install();
    registerToolbar.mock.calls[0]![0].onSelect?.({} as BibleToolContext);

    unregisterExtension("word-study-extension");

    expect(tools.listToolbarTools().map((tool) => tool.id)).not.toContain(
      "word-study-interlinear"
    );
    expect(panes.panes.value).toEqual([]);
  });
});
