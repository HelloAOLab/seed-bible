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
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";

const CUSTOM_TOOL_ID = "test-toolbar-tool";
const CUSTOM_VERSE_TOOL_ID = "test-verse-toolbar-tool";
const CUSTOM_ITEMS_TOOL_ID = "test-toolbar-tool-items";

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
    sharedSession: null,
    selectorState: {
      setOpen: jest.fn(),
    } as any,
    openSidebar: jest.fn(),
    panesManager: {} as any,
    tabs: {} as any,
  };
}

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
      onSelect: jest.fn(),
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
    const firstItemOnSelect = jest.fn();
    const secondItemOnSelect = jest.fn();

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
        onSelect: jest.fn(),
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
            onSelect: jest.fn(),
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
});
