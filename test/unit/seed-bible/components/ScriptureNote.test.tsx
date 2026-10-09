import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  ScriptureNotePopover,
  ScriptureNoteSheet,
} from "@packages/seed-bible/seed-bible/components/ScriptureNote/ScriptureNote";
import {
  createPlayingState,
  type PlaylistItemData,
  type SimplePlaylist,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const BOOK_NAMES: Record<string, string> = { JHN: "John", GEN: "Genesis" };
const resolveBookName = (id: string) => BOOK_NAMES[id] ?? id;

const noted: PlaylistItemData = {
  type: "bible-verse",
  ref: { bookId: "JHN", chapter: 3, verse: 16, endVerse: 17 },
  note: "<p><strong>God so loved</strong> the world</p>",
};
const plain: PlaylistItemData = {
  type: "bible-verse",
  ref: { bookId: "GEN", chapter: 1 },
};
const text: PlaylistItemData = { type: "html", html: "<p>Pause here</p>" };

function playlist(items: PlaylistItemData[]): SimplePlaylist {
  return {
    id: "p1",
    title: "Playlist",
    description: null,
    heroImageUrl: null,
    items,
  };
}

/** Ticks real timers inside act() until `check` passes (or gives up). */
async function waitFor(check: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("condition never became true");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

function rect(top: number, left: number, width: number, height: number) {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("ScriptureNoteSheet", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const sheet = () => container.querySelector(".sb-scripture-note-sheet");

  it("shows the playing passage's note with its reference", async () => {
    const playing = createPlayingState([playlist([noted])]);
    act(() => {
      render(
        <ScriptureNoteSheet
          playing={playing}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });

    expect(sheet()?.textContent).toContain("John 3:16-17");
    await waitFor(() => !!sheet()?.querySelector("strong"));
    expect(sheet()?.textContent).toContain("God so loved the world");
  });

  it("shows nothing for scripture without a note or for other item types", async () => {
    const playing = createPlayingState([playlist([plain, text, noted])]);
    act(() => {
      render(
        <ScriptureNoteSheet
          playing={playing}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });
    expect(sheet()).toBeNull();

    await act(() => playing.next());
    expect(sheet()).toBeNull();

    await act(() => playing.next());
    expect(sheet()).not.toBeNull();
  });

  it("collapses to its title, and opens again on the next noted step", async () => {
    const second: PlaylistItemData = { ...noted, note: "<p>Second</p>" };
    const playing = createPlayingState([playlist([noted, second])]);
    act(() => {
      render(
        <ScriptureNoteSheet
          playing={playing}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });

    act(() => {
      sheet()!
        .querySelector<HTMLButtonElement>(".sb-scripture-note-sheet-header")!
        .click();
    });
    expect(sheet()?.querySelector(".sb-scripture-note-body")).toBeNull();
    expect(sheet()?.textContent).toContain("John 3:16-17");

    await act(() => playing.next());
    expect(sheet()?.querySelector(".sb-scripture-note-body")).not.toBeNull();
  });
});

describe("ScriptureNotePopover", () => {
  let container: HTMLDivElement;
  let reader: HTMLDivElement;
  const readerRef = createRef<HTMLDivElement>();

  /** Lays out a reader filling the viewport, with verses 15-18 stacked. */
  function layOutReader(verseTops: Record<number, number>) {
    reader.getBoundingClientRect = () => rect(0, 0, 1024, 768);
    reader.innerHTML = "";
    for (const [n, top] of Object.entries(verseTops)) {
      const verse = document.createElement("span");
      verse.className = "sb-verse";
      verse.dataset.verseNumber = n;
      // A narrow text column, so there's room beside it for the popover.
      verse.getBoundingClientRect = () => rect(top, 100, 400, 40);
      reader.appendChild(verse);
    }
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    reader = document.createElement("div");
    document.body.appendChild(reader);
    (readerRef as { current: HTMLDivElement | null }).current = reader;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    reader.remove();
  });

  const popover = () =>
    document.querySelector<HTMLElement>(".sb-scripture-note-popover");
  const button = (label: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent?.includes(label) || b.ariaLabel === label
    );

  function renderPopover(playing: ReturnType<typeof createPlayingState>) {
    act(() => {
      render(
        <ScriptureNotePopover
          playing={playing}
          readerRef={readerRef}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });
  }

  it("points at the passage from beside it, outside the reader's own tree", async () => {
    layOutReader({ 15: 100, 16: 140, 17: 180, 18: 220 });
    const playing = createPlayingState([playlist([noted])]);
    renderPopover(playing);

    await waitFor(() => !!popover());
    // Portaled to <body>, so the reader's layout can't clip it.
    expect(container.contains(popover())).toBe(false);
    expect(popover()!.textContent).toContain("John 3:16-17");
    // Verses 16-17 span 140-220 and end at x=500; the popover sits to their
    // right, with its pointer on the side facing them.
    expect(parseFloat(popover()!.style.left)).toBeGreaterThan(500);
    expect(popover()!.querySelector(".sb-tour-arrow-right")).not.toBeNull();
    await waitFor(() => !!popover()!.querySelector("strong"));
  });

  it("docks in the reader's corner with no pointer while the passage is off screen", async () => {
    layOutReader({ 16: 2000, 17: 2040 });
    renderPopover(createPlayingState([playlist([noted])]));

    await waitFor(() => !!popover());
    expect(popover()!.classList).toContain("sb-scripture-note-popover--docked");
    expect(popover()!.querySelector(".sb-tour-arrow")).toBeNull();
  });

  it("steps through the playlist with previous and next", async () => {
    layOutReader({ 16: 140, 17: 180 });
    const second: PlaylistItemData = { ...noted, note: "<p>Second</p>" };
    const playing = createPlayingState([playlist([noted, second, plain])]);
    renderPopover(playing);
    await waitFor(() => !!popover());

    expect(button("Previous")).toBeUndefined();
    expect(popover()!.textContent).toContain("1 of 3");

    await act(async () => button("Next")!.click());
    expect(playing.currentIndex.value).toBe(1);
    await waitFor(() => !!popover()?.textContent?.includes("2 of 3"));

    await act(async () => button("Previous")!.click());
    expect(playing.currentIndex.value).toBe(0);

    // A step without a note shows no popover at all.
    await act(() => playing.jumpTo(2));
    expect(popover()).toBeNull();
  });

  it("can be hidden for the step and shown again", async () => {
    layOutReader({ 16: 140, 17: 180 });
    const playing = createPlayingState([playlist([noted, noted])]);
    renderPopover(playing);
    await waitFor(() => !!popover());

    act(() => button("Hide note")!.click());
    expect(popover()).toBeNull();

    act(() => button("Show note")!.click());
    await waitFor(() => !!popover());

    // Hiding lasts only for the step it was hidden on.
    act(() => button("Hide note")!.click());
    await act(() => playing.next());
    await waitFor(() => !!popover());
  });

  it("disables next on the last step of a queue that can't finish", async () => {
    layOutReader({ 16: 140, 17: 180 });
    renderPopover(createPlayingState([playlist([noted])]));
    await waitFor(() => !!popover());

    expect(button("Next")!.disabled).toBe(true);
  });
});
