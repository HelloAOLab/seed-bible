import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";

/** The width `app.isMobile` needs to see for the bottom tab bar to render. */
const MOBILE_VIEWPORT_WIDTH = 400;

// The app defaults to the private API endpoint, so the mocked responses have to
// be keyed on it (the shared default map targets the free-use endpoint).
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

function createPrivateEndpointResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
  };
}

describe("BibleReaderToolbar — verse toolbar vs. fullscreen panes", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  beforeEach(async () => {
    // Mobile viewport: every pane renders fullscreen and the verse toolbar
    // renders as the bottom sheet.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    window.innerHeight = 800;

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState({
      responses: createPrivateEndpointResponses(),
    });

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function selectFirstVerse() {
    const readingState = state.app.currentReadingState.value!.tab.readingState;
    const chapter = readingState.chapterData.value!;
    const firstVerse = chapter.chapter.content.find(
      (entry): entry is ChapterVerse =>
        !!entry &&
        typeof entry === "object" &&
        (entry as { type?: string }).type === "verse"
    )!;

    await act(async () => {
      readingState.selectVerse(
        {
          bookId: chapter.book.id,
          chapterNumber: chapter.chapter.number,
          verse: firstVerse,
          translationId: chapter.translation.id,
        },
        10,
        10
      );
    });

    return readingState;
  }

  async function renderToolbar() {
    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });
  }

  it("keeps an open pane open when the verse selection is cleared", async () => {
    expect(state.app.isMobile.value).toBe(true);

    const readingState = await selectFirstVerse();

    await act(async () => {
      state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });
    expect(state.panes.panes.value).toHaveLength(1);

    await act(async () => {
      readingState.clearSelectedVerses();
    });

    // Clearing the selection only rewrites the `?verse` param, which is
    // selection state — not a navigation that should reveal the reader.
    expect(state.panes.panes.value).toHaveLength(1);
  });

  it("hides the verse toolbar while a pane fills the screen, and restores it when the pane closes", async () => {
    await selectFirstVerse();
    await renderToolbar();

    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();
    // The verse sheet replaces the bottom bar while it is showing.
    expect(container.querySelector(".sb-reader-toolbar-wrap")).toBeNull();

    let pane!: { id: string };
    await act(async () => {
      pane = state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });

    // Pane covers the reader: the verse sheet steps aside and the bottom bar
    // (which the pane reserves room for) comes back.
    expect(container.querySelector(".sb-verse-toolbar")).toBeNull();
    expect(container.querySelector(".sb-reader-toolbar-wrap")).not.toBeNull();
    // The selection itself is untouched.
    expect(
      state.app.currentReadingState.value!.tab.readingState.selectedVerses.value
    ).toHaveLength(1);

    await act(async () => {
      state.panes.closePane(pane.id, "user");
    });

    expect(container.querySelector(".sb-verse-toolbar")).not.toBeNull();
  });

  it("does not clear the verse selection when the pane covering the reader is tapped", async () => {
    const readingState = await selectFirstVerse();
    await renderToolbar();

    await act(async () => {
      state.panes.openPane({
        placement: "floating",
        title: "Jerusalem",
        component: () => <div className="test-pane-body" />,
      });
    });

    await act(async () => {
      document.body.dispatchEvent(
        new window.PointerEvent("pointerdown", { bubbles: true })
      );
    });

    expect(readingState.selectedVerses.value).toHaveLength(1);
  });
});

describe("BibleReaderToolbar mobile More menu", () => {
  let container: HTMLDivElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    // `viewportWidth` is seeded from `window.innerWidth` when the state is
    // created, so this has to be set before `createTestSeedBibleState`.
    window.innerWidth = MOBILE_VIEWPORT_WIDTH;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    window.innerWidth = originalInnerWidth;
  });

  async function renderToolbar(): Promise<{
    state: SeedBibleState;
    moreButton: HTMLButtonElement;
  }> {
    const state = await createTestSeedBibleState();

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const moreButton = container.querySelector<HTMLButtonElement>(
      ".sb-reader-toolbar-more-anchor button"
    );
    if (!moreButton) {
      throw new Error("The mobile More button did not render.");
    }
    return { state, moreButton };
  }

  const menu = () => container.querySelector(".sb-mobile-more-menu");

  async function openMenu(moreButton: HTMLButtonElement): Promise<void> {
    await act(async () => {
      moreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu()).not.toBeNull();
  }

  it("closes when a tap lands outside the menu", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    await act(async () => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });

  it("stays open while the tap is inside the menu", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    const item = container.querySelector(".sb-mobile-more-menu-item");
    expect(item).not.toBeNull();

    await act(async () => {
      item!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    // Menu items close the menu through their own click handler, not through the
    // outside-tap listener — so the pointerdown alone must leave it open.
    expect(menu()).not.toBeNull();
  });

  it("lets the dismissing tap through to whatever it landed on", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    // Stands in for a verse or a top quick-toolbar button: the tap that closes
    // the menu must still reach its target and do its job.
    const outside = document.createElement("button");
    const onClick = vi.fn();
    outside.addEventListener("click", onClick);
    document.body.appendChild(outside);

    await act(async () => {
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(menu()).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it("closes on Escape and returns focus to the More button", async () => {
    const { moreButton } = await renderToolbar();
    moreButton.focus();
    await openMenu(moreButton);

    // A keyboard user tabs into the menu before deciding to back out, so focus
    // is inside the popover — which is about to be removed from the document.
    const item = container.querySelector<HTMLButtonElement>(
      ".sb-mobile-more-menu-item"
    );
    item!.focus();
    expect(document.activeElement).toBe(item);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(menu()).toBeNull();
    // Without this, focus is left on the removed popover and the next Tab press
    // restarts from the top of the document.
    expect(document.activeElement).toBe(moreButton);
  });

  it("stops listening once the menu is closed", async () => {
    const { moreButton } = await renderToolbar();
    await openMenu(moreButton);

    // Close it the ordinary way, by tapping the button again.
    await act(async () => {
      moreButton.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true })
      );
      moreButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(menu()).toBeNull();

    // A later Escape must not be picked up by a listener that should have been
    // torn down — and must not reopen or otherwise disturb anything.
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(menu()).toBeNull();
  });
});
