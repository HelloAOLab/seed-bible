import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { SidebarSearch } from "@packages/seed-bible/seed-bible/components/SidebarSearch";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

jest.mock("seed-bible.components.ContextMenu", () => ({
  closeContextMenus: jest.fn(),
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ComponentChildren;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  ),
  ContextMenuWithButton: ({
    children,
    buttonClassName,
    onClick,
  }: {
    children: ComponentChildren;
    buttonClassName?: string;
    onClick?: () => void;
  }) => (
    <div>
      <button className={buttonClassName} onClick={onClick}>
        Menu
      </button>
      <div>{children}</div>
    </div>
  ),
}));

type SidebarSearchFixture = {
  state: SeedBibleState;
  search: jest.Mock;
  selectTranslationAndChapter: jest.Mock;
  addTab: jest.Mock;
  setSelectedPaneTab: jest.Mock;
  newTabSelectTranslationAndChapter: jest.Mock;
};

function createTab(
  id: string,
  selectTranslationAndChapter: jest.Mock
): ReaderTab {
  return {
    id,
    title: id,
    sharedSession: null,
    readingState: {
      bookId: signal("GEN"),
      chapterNumber: signal(1),
      translationId: signal("BSB"),
      translation: signal({ textDirection: "ltr" } as any),
      translationBooks: signal({
        books: [
          {
            id: "GEN",
            name: "Genesis",
          },
        ],
      } as any),
      selectTranslationAndChapter,
    } as any,
  };
}

function createFixture(options?: {
  hasSelectedTab?: boolean;
}): SidebarSearchFixture {
  const currentTabSelectTranslationAndChapter = jest.fn(async () => undefined);
  const newTabSelectTranslationAndChapter = jest.fn(async () => undefined);
  const currentTab = createTab("tab-1", currentTabSelectTranslationAndChapter);
  const newTab = createTab("tab-2", newTabSelectTranslationAndChapter);
  const hasSelectedTab = options?.hasSelectedTab ?? true;
  const selectedTabSignal = signal<ReaderTab | null>(
    hasSelectedTab ? currentTab : null
  );
  const tabsSignal = signal(hasSelectedTab ? [currentTab] : []);
  const selectedTabId = signal(hasSelectedTab ? currentTab.id : "");
  const search = jest.fn();
  const setSelectedPaneTab = jest.fn();
  const addTab = jest.fn(() => {
    tabsSignal.value = [...tabsSignal.value, newTab];
    selectedTabSignal.value = newTab;
    selectedTabId.value = newTab.id;
    return newTab;
  });
  const appSelectTab = jest.fn((tabId: string) => {
    const nextTab = tabsSignal.value.find((tab) => tab.id === tabId) ?? null;
    selectedTabSignal.value = nextTab;
    selectedTabId.value = tabId;
  });

  const state = {
    app: {
      panelsEnabled: signal(true),
      selectedTab: selectedTabSignal,
      addTab: jest.fn(),
      selectTab: appSelectTab,
      openInNewPane: jest.fn(),
      openInDetachedPane: jest.fn(),
    },
    tabs: {
      tabs: tabsSignal,
      selectedTabId,
      addTab,
      removeTab: jest.fn(),
    },
    panes: {
      setSelectedPaneTab,
    },
    search: {
      search,
    },
  } as any as SeedBibleState;

  return {
    state,
    search,
    selectTranslationAndChapter: currentTabSelectTranslationAndChapter,
    addTab,
    setSelectedPaneTab,
    newTabSelectTranslationAndChapter,
  };
}

describe("SidebarSearch", () => {
  let container: HTMLDivElement;
  let scrollIntoViewMock: jest.Mock;
  let originalScrollIntoView: typeof HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    scrollIntoViewMock = jest.fn();
    originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.useRealTimers();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  async function searchForVerse(query: string) {
    const input = container.querySelector(
      ".sb-sidebar-search-input"
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      if (input) {
        input.value = query;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  async function pressSearchKey(key: string) {
    const input = container.querySelector(
      ".sb-sidebar-search-input"
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true })
      );
      await Promise.resolve();
    });
  }

  it("searches verses and opens the chapter in the current tab when a result is clicked", async () => {
    const fixture = createFixture();
    const currentTab = fixture.state.app.selectedTab.value!;
    const currentSelect = currentTab.readingState
      .selectTranslationAndChapter as jest.Mock;

    fixture.search.mockResolvedValue({
      found: 1,
      out_of: 1,
      page: 1,
      hits: [
        {
          document: {
            id: "verse-1",
            translation: "BSB",
            book: "GEN",
            chapter: 1,
            verse: 1,
            reference: "Genesis 1:1",
            text: "In the beginning.",
          },
        },
      ],
    });

    act(() => {
      render(
        <SidebarSearch state={fixture.state} closeLayoutMenu={jest.fn()} />,
        container
      );
    });

    await searchForVerse("beginning");

    expect(fixture.search).toHaveBeenCalledWith("verses", "beginning");
    expect(container.querySelector(".sb-sidebar-search-panel")).not.toBeNull();

    const resultButton = container.querySelector(
      ".sb-sidebar-search-result-button"
    ) as HTMLButtonElement | null;
    expect(resultButton).not.toBeNull();

    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(currentSelect).toHaveBeenCalledWith("BSB", "GEN", 1);
    expect(fixture.addTab).not.toHaveBeenCalled();
  });

  it("opens a new tab when there is no current tab", async () => {
    const fixture = createFixture({ hasSelectedTab: false });

    fixture.search.mockResolvedValue({
      found: 1,
      out_of: 1,
      page: 1,
      hits: [
        {
          document: {
            id: "verse-2",
            translation: "NIV",
            book: "MAT",
            chapter: 5,
            verse: 9,
            text: "Blessed are the peacemakers.",
          },
        },
      ],
    });

    act(() => {
      render(
        <SidebarSearch state={fixture.state} closeLayoutMenu={jest.fn()} />,
        container
      );
    });

    await searchForVerse("peacemakers");

    const resultButton = container.querySelector(
      ".sb-sidebar-search-result-button"
    ) as HTMLButtonElement | null;
    expect(resultButton).not.toBeNull();

    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fixture.addTab).toHaveBeenCalledTimes(1);
    expect(fixture.setSelectedPaneTab).toHaveBeenCalledWith("tab-2");
    expect(fixture.newTabSelectTranslationAndChapter).toHaveBeenCalledWith(
      "NIV",
      "MAT",
      5
    );
  });

  it("supports keyboard navigation for search results", async () => {
    const fixture = createFixture();
    const currentTab = fixture.state.app.selectedTab.value!;
    const currentSelect = currentTab.readingState
      .selectTranslationAndChapter as jest.Mock;

    fixture.search.mockResolvedValue({
      found: 2,
      out_of: 2,
      page: 1,
      hits: [
        {
          document: {
            id: "verse-1",
            translation: "BSB",
            book: "GEN",
            chapter: 1,
            verse: 1,
            reference: "Genesis 1:1",
            text: "In the beginning.",
          },
        },
        {
          document: {
            id: "verse-2",
            translation: "BSB",
            book: "GEN",
            chapter: 1,
            verse: 2,
            reference: "Genesis 1:2",
            text: "The earth was formless.",
          },
        },
      ],
    });

    act(() => {
      render(
        <SidebarSearch state={fixture.state} closeLayoutMenu={jest.fn()} />,
        container
      );
    });

    await searchForVerse("genesis");

    await pressSearchKey("ArrowDown");

    let resultButtons = Array.from(
      container.querySelectorAll(".sb-sidebar-search-result-button")
    ) as HTMLButtonElement[];
    expect(resultButtons[0]?.className).toContain(
      "sb-sidebar-search-result-button-highlighted"
    );
    expect(resultButtons[1]?.className).not.toContain(
      "sb-sidebar-search-result-button-highlighted"
    );
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
      block: "nearest",
    });

    await pressSearchKey("ArrowUp");

    resultButtons = Array.from(
      container.querySelectorAll(".sb-sidebar-search-result-button")
    ) as HTMLButtonElement[];
    expect(resultButtons[0]?.className).not.toContain(
      "sb-sidebar-search-result-button-highlighted"
    );
    expect(resultButtons[1]?.className).toContain(
      "sb-sidebar-search-result-button-highlighted"
    );
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
      block: "nearest",
    });

    await pressSearchKey("Enter");

    expect(currentSelect).toHaveBeenCalledWith("BSB", "GEN", 1);
    expect(currentSelect).toHaveBeenCalledTimes(1);
  });
});
