import { render } from "preact";
import { act } from "preact/test-utils";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingState } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
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

/**
 * Height jsdom reports for the sheet's overflow row. jsdom does no layout, so
 * every element measures 0 and the sheet would believe it has nothing to reveal.
 */
const OVERFLOW_HEIGHT = 120;

/** Same, for the "swipe up to see more" hint, which collapses as the drawer opens. */
const HINT_HEIGHT = 24;

describe("BibleReaderToolbar — mobile verse sheet drag", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let readingState: BibleReadingState;
  let originalScrollHeight: PropertyDescriptor | undefined;

  beforeEach(async () => {
    // Mobile viewport, so the verse toolbar renders as the bottom sheet.
    window.innerWidth = 400;
    window.innerHeight = 800;

    originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight"
    );
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.classList.contains("sb-verse-toolbar-overflow-row")) {
          return OVERFLOW_HEIGHT;
        }
        if (this.classList.contains("sb-verse-toolbar-swipe-hint")) {
          return HINT_HEIGHT;
        }
        return 0;
      },
    });

    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState({
      responses: createPrivateEndpointResponses(),
    });

    // The default tool set renders exactly one row here (highlight, bookmark,
    // copy, share), so there would be nothing to drag open. Two extra tools push
    // it past a row, which is the case the gesture exists for.
    for (const id of ["test-extra-one", "test-extra-two"]) {
      state.tools.registerVerseToolbarTool({
        id,
        priority: 500,
        title: id,
        icon: () => <span className="material-symbols-outlined">star</span>,
        onSelect: () => {},
      });
    }

    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    if (originalScrollHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollHeight",
        originalScrollHeight
      );
    }
  });

  async function renderSheet() {
    readingState = state.app.currentReadingState.value!.tab.readingState;
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

    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });

    const handle = container.querySelector<HTMLElement>(
      ".sb-verse-toolbar-handle-area"
    );
    if (!handle) throw new Error("The verse sheet handle did not render.");
    return handle;
  }

  const sheet = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-mobile");
  const overflow = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-overflow");
  const hint = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-swipe-hint");
  const hintSlot = () =>
    container.querySelector<HTMLElement>(".sb-verse-toolbar-swipe-hint-slot");

  async function press(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          pointerId: 1,
          clientY,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  async function moveTo(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointermove", {
          pointerId: 1,
          clientY,
          bubbles: true,
        })
      );
    });
  }

  async function release(handle: HTMLElement, clientY: number) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointerup", {
          pointerId: 1,
          clientY,
          bubbles: true,
        })
      );
    });
  }

  it("starts collapsed, with the swipe hint in place of a More button", async () => {
    await renderSheet();

    expect(overflow()?.style.height).toBe("0px");
    expect(hint()?.textContent).toContain("Swipe up to see more");
    expect(hintSlot()?.style.height).toBe(`${HINT_HEIGHT}px`);
    // The card that used to carry this job is gone — the hint replaced it.
    expect(container.querySelector(".sb-verse-toolbar-more-toggle")).toBeNull();
  });

  it("keeps the closed drawer's actions out of the tab order", async () => {
    const handle = await renderSheet();

    // Clipped-but-focusable would let a keyboard land on invisible buttons.
    expect(overflow()?.className).toContain("sb-verse-toolbar-overflow-closed");

    await press(handle, 500);
    await moveTo(handle, 480);

    expect(overflow()?.className).not.toContain(
      "sb-verse-toolbar-overflow-closed"
    );
  });

  it("opens the drawer by the distance the finger has travelled", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 460);

    // The point of the rework: the drawer moves with the finger instead of
    // waiting for a threshold and jumping open.
    expect(overflow()?.style.height).toBe("40px");
    expect(sheet()?.className).toContain("sb-verse-sheet-dragging");

    await moveTo(handle, 420);
    expect(overflow()?.style.height).toBe("80px");
  });

  it("never opens the drawer further than its content", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 100);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
  });

  it("follows the finger back down again mid-drag", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 400);
    expect(overflow()?.style.height).toBe("100px");

    await moveTo(handle, 480);
    expect(overflow()?.style.height).toBe("20px");
  });

  it("settles open when released past halfway", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 500 - OVERFLOW_HEIGHT / 2 - 5);
    await release(handle, 500 - OVERFLOW_HEIGHT / 2 - 5);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(sheet()?.className).not.toContain("sb-verse-sheet-dragging");
    // Nothing left to reveal, so the hint collapses out of the way.
    expect(hintSlot()?.style.height).toBe("0px");
  });

  it("stays open after a short lift instead of falling back closed", async () => {
    const handle = await renderSheet();

    // Well short of halfway. A midpoint rule would abandon this drag, which
    // read as the drawer refusing to stay where it had been put.
    await press(handle, 500);
    await moveTo(handle, 480);
    await release(handle, 480);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(hintSlot()?.style.height).toBe("0px");
  });

  it("leaves the sheet untouched until the finger clears the tap slop", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    // 4px of thumb wobble: the sheet must not budge, or the toggle that follows
    // animates from a nudged position and looks like it snaps before it moves.
    await moveTo(handle, 496);
    expect(overflow()?.style.height).toBe("0px");
    expect(sheet()?.className).not.toContain("sb-verse-sheet-dragging");

    await moveTo(handle, 504);
    expect(sheet()?.style.transform).toBe("");
    expect(sheet()?.className).not.toContain("sb-verse-sheet-dragging");

    // Still a tap on release, so it toggles.
    await release(handle, 504);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
  });

  it("closes an open drawer when dragged back down", async () => {
    const handle = await renderSheet();

    // Open it first.
    await press(handle, 500);
    await moveTo(handle, 300);
    await release(handle, 300);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    // Then drag most of the way back down.
    await press(handle, 300);
    await moveTo(handle, 300 + OVERFLOW_HEIGHT);
    expect(overflow()?.style.height).toBe("0px");
    // Exactly shut, and no further — the sheet itself hasn't started moving yet.
    expect(sheet()?.style.transform).toBe("");
    await release(handle, 300 + OVERFLOW_HEIGHT);

    expect(overflow()?.style.height).toBe("0px");
  });

  it("closes the drawer and dismisses the sheet in one continuous drag", async () => {
    const handle = await renderSheet();

    // Open it first.
    await press(handle, 500);
    await moveTo(handle, 300);
    await release(handle, 300);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    // One drag down: the first OVERFLOW_HEIGHT pixels shut the drawer, and the
    // travel beyond that pushes the whole sheet away. It used to take two
    // separate drags to get from fully open to dismissed.
    await press(handle, 300);
    await moveTo(handle, 300 + OVERFLOW_HEIGHT + 100);
    expect(overflow()?.style.height).toBe("0px");
    expect(sheet()?.style.transform).toBe("translateY(100px)");

    await release(handle, 300 + OVERFLOW_HEIGHT + 100);
    expect(readingState.selectedVerses.value).toHaveLength(0);
  });

  it("toggles on a tap that barely moves", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 498);
    await release(handle, 498);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    await press(handle, 500);
    await release(handle, 500);

    expect(overflow()?.style.height).toBe("0px");
  });

  it("slides the whole sheet down when dragged down while collapsed", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 540);

    // Nothing to close, so the gesture becomes a dismiss and the sheet itself
    // follows the finger.
    expect(sheet()?.style.transform).toBe("translateY(40px)");
    expect(overflow()?.style.height).toBe("0px");
  });

  it("dismisses the selection when the sheet is dragged far enough down", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 600);
    await release(handle, 600);

    expect(readingState.selectedVerses.value).toHaveLength(0);
  });

  it("springs back and keeps the selection when the drag stops short", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 530);
    await release(handle, 530);

    expect(readingState.selectedVerses.value).toHaveLength(1);
    expect(sheet()?.style.transform).toBe("");
    expect(overflow()?.style.height).toBe("0px");
  });

  async function cancel(handle: HTMLElement) {
    await act(async () => {
      handle.dispatchEvent(
        new window.PointerEvent("pointercancel", {
          pointerId: 1,
          bubbles: true,
        })
      );
    });
  }

  it("keeps what an upward drag achieved when the gesture is cancelled", async () => {
    const handle = await renderSheet();

    await press(handle, 500);
    await moveTo(handle, 380);
    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);

    // The sheet lives on the bottom edge, where the OS's own swipe-up gesture
    // is, so an upward drag getting cancelled mid-flight is routine. Discarding
    // it there looked exactly like the drawer refusing to stay open.
    await cancel(handle);

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(readingState.selectedVerses.value).toHaveLength(1);
  });

  it("never dismisses the selection on a cancelled gesture", async () => {
    const handle = await renderSheet();

    // Far enough down that releasing would have dismissed it.
    await press(handle, 500);
    await moveTo(handle, 620);
    await cancel(handle);

    expect(readingState.selectedVerses.value).toHaveLength(1);
    expect(sheet()?.style.transform).toBe("");
  });

  it("exposes the handle to keyboards, which have no gesture available", async () => {
    const handle = await renderSheet();

    expect(handle.getAttribute("role")).toBe("button");
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(handle.tabIndex).toBe(0);

    await act(async () => {
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(overflow()?.style.height).toBe(`${OVERFLOW_HEIGHT}px`);
    expect(handle.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    });

    expect(overflow()?.style.height).toBe("0px");
  });
});
