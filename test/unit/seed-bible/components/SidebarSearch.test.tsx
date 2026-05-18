import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { SidebarSearch } from "@packages/seed-bible/seed-bible/components/SidebarSearch";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";

jest.mock("../components/ContextMenu", () => ({
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
  search: jest.SpyInstance;
  addTab: jest.SpyInstance;
  addTabOriginal: SeedBibleState["tabs"]["addTab"];
  setSelectedPaneTab: jest.SpyInstance;
};

async function createFixture(options?: {
  hasSelectedTab?: boolean;
}): Promise<SidebarSearchFixture> {
  const state = await createTestSeedBibleState();
  const hasSelectedTab = options?.hasSelectedTab ?? true;

  if (!hasSelectedTab) {
    state.tabs.tabs.value = [];
    state.tabs.selectedTabId.value = "";
  }

  const addTabOriginal = state.tabs.addTab.bind(state.tabs);
  const search = jest.spyOn(state.search, "searchVerses");
  const addTab = jest.spyOn(state.tabs, "addTab");
  const setSelectedPaneTab = jest.spyOn(state.panes, "setSelectedPaneTab");

  return {
    state,
    search,
    addTab,
    addTabOriginal,
    setSelectedPaneTab,
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
    const fixture = await createFixture();
    const currentTab = fixture.state.app.selectedTab.value!;
    const currentSelect = jest.spyOn(
      currentTab.readingState,
      "selectTranslationAndChapter"
    );

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

    expect(fixture.search).toHaveBeenCalledWith("eng", "AAB", "beginning");
    expect(container.querySelector(".sb-sidebar-search-panel")).not.toBeNull();

    const resultButton = container.querySelector(
      ".sb-sidebar-search-result-button"
    ) as HTMLButtonElement | null;
    expect(resultButton).not.toBeNull();

    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(currentSelect).toHaveBeenCalledWith("BSB", "GEN", 1, {
      scrollToVerse: 1,
    });
    expect(fixture.addTab).not.toHaveBeenCalled();

    await waitFor(
      () =>
        fixture.state.app.selectedTab.value!.readingState.loading.value ===
        false
    );

    expect(
      fixture.state.app.selectedTab.value!.readingState.decorations.value
    ).toEqual([
      {
        id: expect.any(String),
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-verse-decoration-search-result",
        removeAfterMs: 3000,
      },
    ]);
  });

  it("opens a new tab when there is no current tab", async () => {
    const fixture = await createFixture({ hasSelectedTab: false });
    let newTabSelect: jest.SpyInstance | null = null;

    fixture.addTab.mockImplementation((...args: any[]) => {
      const tab = fixture.addTabOriginal(...args);
      newTabSelect = jest.spyOn(
        tab.readingState,
        "selectTranslationAndChapter"
      );
      return tab;
    });

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
    const newTab = fixture.state.app.selectedTab.value;
    expect(newTab).not.toBeNull();
    expect(fixture.setSelectedPaneTab).toHaveBeenCalledWith(newTab!.id);
    expect(newTabSelect).not.toBeNull();
    expect(newTabSelect).toHaveBeenCalledWith("NIV", "MAT", 5, {
      scrollToVerse: 9,
    });
  });

  it("supports keyboard navigation for search results", async () => {
    const fixture = await createFixture();
    const currentTab = fixture.state.app.selectedTab.value!;
    const currentSelect = jest.spyOn(
      currentTab.readingState,
      "selectTranslationAndChapter"
    );

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

    expect(currentSelect).toHaveBeenCalledWith("BSB", "GEN", 1, {
      scrollToVerse: 2,
    });
    expect(currentSelect).toHaveBeenCalledTimes(1);
  });
});
