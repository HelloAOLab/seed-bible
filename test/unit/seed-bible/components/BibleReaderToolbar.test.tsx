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
    window.innerWidth = 400;
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
