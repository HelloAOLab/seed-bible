import { signal } from "@preact/signals";

jest.mock(
  "seed-bible.components.icons",
  () => ({
    MaterialIcon: () => null,
    SeedBibleIcon: () => null,
  }),
  { virtual: true }
);

import {
  createBibleToolsManager,
  type BibleToolContext,
} from "@packages/seed-bible-refresh/seed-bible/managers/BibleToolsManager";

const CUSTOM_TOOL_ID = "test-toolbar-tool";
const CUSTOM_VERSE_TOOL_ID = "test-verse-toolbar-tool";

function createContext(): BibleToolContext {
  return {
    readingState: {
      chapterData: signal(null),
      loading: signal(false),
      selectedVerses: signal([]),
      clearSelectedVerses: jest.fn(),
      loadPreviousChapter: jest.fn(),
      loadNextChapter: jest.fn(),
    } as any,
    selectorState: {
      setOpen: jest.fn(),
    } as any,
    openSidebar: jest.fn(),
    panesManager: {} as any,
    tabs: {} as any,
  };
}

describe("useBibleToolsManager", () => {
  afterEach(() => {
    const manager = createBibleToolsManager();
    manager.unregisterToolbarTool(CUSTOM_TOOL_ID);
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
      onSelect: jest.fn(),
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
      onSelect: jest.fn(),
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
      onSelect: jest.fn(),
    });

    manager.registerToolbarTool({
      id: `${CUSTOM_TOOL_ID}-hidden`,
      priority: 60,
      title: "Hidden Tool",
      icon: () => <span>icon</span>,
      isVisible: () => false,
      onSelect: jest.fn(),
    });

    const tools = manager.getToolbarTools(context);

    const customTool = tools.find((tool) => tool.id === CUSTOM_TOOL_ID);
    expect(customTool).toBeDefined();
    expect(customTool?.visible).toBe(true);
    expect(customTool?.disabled).toBe(true);
    expect(tools.some((tool) => tool.id === `${CUSTOM_TOOL_ID}-hidden`)).toBe(
      false
    );

    manager.unregisterToolbarTool(`${CUSTOM_TOOL_ID}-hidden`);
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
      onSelect: jest.fn(),
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
      onSelect: jest.fn(),
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
      onSelect: jest.fn(),
    });

    manager.registerVerseToolbarTool({
      id: `${CUSTOM_VERSE_TOOL_ID}-hidden`,
      priority: 11,
      title: "Hidden Verse Tool",
      icon: () => <span>icon</span>,
      isVisible: () => false,
      onSelect: jest.fn(),
    });

    const tools = manager.getVerseToolbarTools(context);

    const customTool = tools.find((tool) => tool.id === CUSTOM_VERSE_TOOL_ID);
    expect(customTool).toBeDefined();
    expect(customTool?.visible).toBe(true);
    expect(customTool?.disabled).toBe(true);
    expect(
      tools.some((tool) => tool.id === `${CUSTOM_VERSE_TOOL_ID}-hidden`)
    ).toBe(false);

    manager.unregisterVerseToolbarTool(`${CUSTOM_VERSE_TOOL_ID}-hidden`);
  });
});
