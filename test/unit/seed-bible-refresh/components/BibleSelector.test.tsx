import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleSelector } from "@packages/seed-bible/seed-bible/components/BibleSelector";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { createDefaultManagerResponseMap } from "../managers/testUtils/mockBibleApiData";

jest.mock("seed-bible.i18n.I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

type SelectorFixture = {
  state: SeedBibleState;
  selectorState: BibleSelectorState;
  bibleDataManager: SeedBibleState["bibleData"];
  pane: Pane;
  selectChapter: jest.SpyInstance;
  setSearch: jest.SpyInstance;
};

async function createSelectorFixture(
  options: { open?: boolean } = {}
): Promise<SelectorFixture> {
  const state = await createTestSeedBibleState({
    responses: createDefaultManagerResponseMap(),
  });
  const pane = state.panes.panes.value[0] as Pane;
  if (!pane) {
    throw new Error("Expected an initial pane.");
  }

  if (options.open !== false) {
    await state.selector.setOpen(true, pane);
    // await waitFor(() => state.selector.groupedBooks.value.oldTestament.length > 0);
  }

  return {
    state,
    selectorState: state.selector,
    bibleDataManager: state.bibleData,
    pane,
    selectChapter: jest.spyOn(state.selector, "selectChapter"),
    setSearch: jest.spyOn(state.selector, "setSearch"),
  };
}

describe("BibleSelector", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("is not displayed when closed", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture({
      open: false,
    });

    act(() => {
      render(
        <BibleSelector
          isOpen={false}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).toBeNull();
  });

  it("is displayed when open", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-selector-overlay.open")).not.toBeNull();
  });

  it("displays all old and new testament books", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-GEN")));
    await waitFor(() => Boolean(container.querySelector("#booktab-EXO")));
    await waitFor(() => Boolean(container.querySelector("#booktab-MAT")));

    const text = container.textContent ?? "";
    expect(text).toContain("Genesis");
    expect(text).toContain("Exodus");
    expect(text).toContain("Matthew");
  });

  it("clicking a chapter selects it", async () => {
    const { selectorState, selectChapter, bibleDataManager } =
      await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-GEN")));

    const genesisButton = Array.from(
      container.querySelectorAll("#booktab-GEN")
    )[0] as HTMLDivElement | undefined;

    expect(genesisButton).toBeDefined();

    act(() => {
      genesisButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() =>
      Array.from(container.querySelectorAll(".chapter-btn")).some(
        (button) => button.textContent?.trim() === "2"
      )
    );

    const chapterTwoButton = Array.from(
      container.querySelectorAll(".chapter-btn")
    ).find((button) => button.textContent?.trim() === "2") as
      | HTMLButtonElement
      | undefined;

    expect(chapterTwoButton).toBeDefined();

    act(() => {
      chapterTwoButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    await waitFor(() => selectChapter.mock.calls.length > 0);
    expect(selectChapter).toHaveBeenCalledWith("GEN", 2);
  });

  it("clicking on a book updates the expanded book state", async () => {
    const { selectorState, bibleDataManager } = await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    await waitFor(() => Boolean(container.querySelector("#booktab-EXO")));

    const exodusButton = Array.from(
      container.querySelectorAll("#booktab-EXO")
    )[0] as HTMLDivElement | undefined;

    expect(exodusButton).toBeDefined();

    act(() => {
      exodusButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => selectorState.bookData.value?.id === "EXO");

    expect(selectorState.bookData.value?.id).toBe("EXO");
    expect(container.querySelectorAll(".chapter-btn").length).toBeGreaterThan(
      0
    );
  });

  it("changing the search input sets the search", async () => {
    const { selectorState, setSearch, bibleDataManager } =
      await createSelectorFixture();

    act(() => {
      render(
        <BibleSelector
          isOpen={true}
          onClose={jest.fn()}
          selectorState={selectorState}
          bibleDataManager={bibleDataManager}
        />,
        container
      );
    });

    const searchInput = container.querySelector(
      'input[placeholder="Search books..."]'
    ) as HTMLInputElement | null;

    expect(searchInput).not.toBeNull();

    act(() => {
      if (!searchInput) {
        return;
      }
      searchInput.value = "exo";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(setSearch).toHaveBeenCalledWith("exo");
    expect(selectorState.search.value).toBe("exo");
  });
});
