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

  /**
   * Lays out a reader filling the 1024px-wide viewport, with a text column
   * (100-500px by default, leaving a wide gutter on the right) holding verses
   * at the given tops. Each verse spans the column unless `verseSpan` says
   * otherwise.
   */
  function layOutReader(
    verseTops: Record<number, number>,
    options: {
      column?: { left: number; width: number };
      verseSpan?: { left: number; width: number };
    } = {}
  ) {
    const column = options.column ?? { left: 100, width: 400 };
    const span = options.verseSpan ?? column;
    reader.getBoundingClientRect = () => rect(0, 0, 1024, 768);
    reader.innerHTML = "";
    const content = document.createElement("div");
    content.className = "sb-chapter-content";
    content.getBoundingClientRect = () =>
      rect(0, column.left, column.width, 2000);
    reader.appendChild(content);
    for (const [n, top] of Object.entries(verseTops)) {
      const verse = document.createElement("span");
      verse.className = "sb-verse";
      verse.dataset.verseNumber = n;
      verse.getBoundingClientRect = () => rect(top, span.left, span.width, 40);
      content.appendChild(verse);
    }
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    reader = document.createElement("div");
    reader.style.direction = "ltr";
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
    // The text column ends at x=500, leaving a gutter wide enough for the
    // popover on the right, level with verses 16-17.
    expect(parseFloat(popover()!.style.left)).toBeGreaterThan(500);
    expect(popover()!.querySelector(".sb-tour-arrow-right")).not.toBeNull();
    await waitFor(() => !!popover()!.querySelector("strong"));
  });

  it("sits in the left gutter for right-to-left text", async () => {
    reader.style.direction = "rtl";
    layOutReader({ 16: 140, 17: 180 }, { column: { left: 524, width: 400 } });
    renderPopover(createPlayingState([playlist([noted])]));

    await waitFor(() => !!popover());
    const left = parseFloat(popover()!.style.left);
    const width = parseFloat(popover()!.style.width);
    expect(left + width).toBeLessThanOrEqual(524);
    expect(popover()!.querySelector(".sb-tour-arrow-left")).not.toBeNull();
  });

  it("uses the gutter of the pane a narrow, centred reader scrolls in", async () => {
    // The reader is only as wide as its text; the room beside it belongs to
    // the scrolling pane around it.
    const pane = document.createElement("div");
    pane.style.overflowY = "auto";
    pane.getBoundingClientRect = () => rect(0, 0, 1024, 768);
    document.body.appendChild(pane);
    pane.appendChild(reader);
    try {
      layOutReader({ 16: 140, 17: 180 }, { column: { left: 212, width: 400 } });
      reader.getBoundingClientRect = () => rect(0, 212, 400, 2000);
      renderPopover(createPlayingState([playlist([noted])]));

      await waitFor(() => !!popover());
      expect(parseFloat(popover()!.style.left)).toBeGreaterThan(612);
      expect(popover()!.querySelector(".sb-tour-arrow-right")).not.toBeNull();
    } finally {
      pane.remove();
    }
  });

  it("goes underneath the passage when there's no gutter beside the text", async () => {
    layOutReader(
      { 15: 100, 16: 140, 17: 180, 18: 220 },
      { column: { left: 40, width: 944 } }
    );
    renderPopover(createPlayingState([playlist([noted])]));

    await waitFor(() => !!popover());
    // Verses 16-17 end at y=220.
    expect(parseFloat(popover()!.style.top)).toBeGreaterThanOrEqual(220);
    expect(popover()!.querySelector(".sb-tour-arrow-bottom")).not.toBeNull();
  });

  it("fits a long note underneath the passage by letting it scroll there", async () => {
    // The note is taller than the 516px left below verse 17 (768 - 220 - 16
    // inset - 16 gap), so uncapped it would only fit docked in the corner.
    const realRect = Element.prototype.getBoundingClientRect;
    const spy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        return this.classList.contains("sb-scripture-note-popover")
          ? rect(0, 0, 300, 700)
          : realRect.call(this);
      });
    try {
      layOutReader({ 16: 140, 17: 180 }, { column: { left: 40, width: 944 } });
      renderPopover(createPlayingState([playlist([noted])]));

      await waitFor(
        () =>
          !!popover()?.querySelector(".sb-tour-arrow-bottom") &&
          popover()!.style.maxHeight === "516px"
      );
      expect(parseFloat(popover()!.style.top)).toBeGreaterThanOrEqual(220);
    } finally {
      spy.mockRestore();
    }
  });

  it("measures the gutter from the text column, not a verse that ends mid-line", async () => {
    // A one-line verse ending at x=300 leaves plenty of room after it, but the
    // column runs to x=850, leaving no gutter wide enough beside the text.
    layOutReader(
      { 16: 140, 17: 180 },
      {
        column: { left: 100, width: 750 },
        verseSpan: { left: 100, width: 200 },
      }
    );
    renderPopover(createPlayingState([playlist([noted])]));

    await waitFor(() => !!popover());
    expect(popover()!.querySelector(".sb-tour-arrow-right")).toBeNull();
    expect(popover()!.querySelector(".sb-tour-arrow-bottom")).not.toBeNull();
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
