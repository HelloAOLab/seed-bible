import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import {
  ScriptureNotePopover,
  ScriptureNoteSheet,
  ScriptureNoteShowTab,
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

  it("heads the note with its title, with the passage above it", async () => {
    const titled: PlaylistItemData = { ...noted, noteTitle: "God so loved" };
    act(() => {
      render(
        <ScriptureNoteSheet
          playing={createPlayingState([playlist([titled])])}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });

    expect(
      sheet()?.querySelector(".sb-scripture-note-title")?.textContent
    ).toBe("God so loved");
    expect(
      sheet()?.querySelector(".sb-scripture-note-passage")?.textContent
    ).toBe("John 3:16-17");
  });

  it("shows a title-only note as a header with nothing to collapse", () => {
    const titleOnly: PlaylistItemData = {
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1, verse: 1 },
      noteTitle: "Listen for 'and God said'",
    };
    act(() => {
      render(
        <ScriptureNoteSheet
          playing={createPlayingState([playlist([titleOnly])])}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });

    expect(sheet()?.textContent).toContain("Listen for 'and God said'");
    expect(sheet()?.querySelector(".sb-scripture-note-body")).toBeNull();
    expect(sheet()?.querySelector("button")).toBeNull();
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

  it("follows the passage when the chapter's content changes", async () => {
    layOutReader({ 16: 140, 17: 180 });
    renderPopover(createPlayingState([playlist([noted])]));
    await waitFor(() => !!popover());
    const before = parseFloat(popover()!.style.top);

    // The verses move down 300px, as when the chapter above them loads.
    layOutReader({ 16: 440, 17: 480 });

    await waitFor(() => parseFloat(popover()!.style.top) === before + 300);
  });

  it("does no measuring while nothing on screen moves", async () => {
    vi.useFakeTimers();
    try {
      layOutReader({ 16: 140, 17: 180 });
      renderPopover(createPlayingState([playlist([noted])]));
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      expect(popover()).not.toBeNull();
      let reads = 0;
      const measureReader = reader.getBoundingClientRect;
      reader.getBoundingClientRect = () => {
        reads++;
        return measureReader();
      };

      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(reads).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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

  it("can be hidden for the step and shown again from the toolbar", async () => {
    layOutReader({ 16: 140, 17: 180 });
    const playing = createPlayingState([playlist([noted, noted])]);
    renderPopover(playing);
    const toolbar = document.createElement("div");
    document.body.appendChild(toolbar);
    act(() => render(<ScriptureNoteShowTab playing={playing} />, toolbar));
    await waitFor(() => !!popover());
    expect(toolbar.textContent).toBe("");

    act(() => button("Hide note")!.click());
    expect(popover()).toBeNull();
    // Nothing is left floating where the note was.
    expect(document.querySelector(".sb-scripture-note-layer")).toBeNull();

    act(() => toolbar.querySelector("button")!.click());
    await waitFor(() => !!popover());
    expect(toolbar.textContent).toBe("");
    act(() => render(null, toolbar));
    toolbar.remove();

    // Hiding lasts only for the step it was hidden on.
    act(() => button("Hide note")!.click());
    await act(() => playing.next());
    await waitFor(() => !!popover());
  });

  it("heads a titled note with its title and the passage it's about", async () => {
    layOutReader({ 16: 140, 17: 180 });
    renderPopover(
      createPlayingState([
        playlist([{ ...noted, noteTitle: "God so loved the world" }]),
      ])
    );
    await waitFor(() => !!popover());

    expect(popover()!.querySelector("h3")?.textContent).toBe(
      "God so loved the world"
    );
    expect(
      popover()!.querySelector(".sb-scripture-note-passage")?.textContent
    ).toBe("John 3:16-17");
  });

  it("docks with no pointer while the reader is at a passage the note links to", async () => {
    layOutReader({ 16: 140, 17: 180 });
    const tab = {
      id: "tab-1",
      readingState: {
        selectTranslationAndChapter: vi.fn(async () => {}),
        translationId: signal("BSB"),
        bookId: signal<string | null>(null),
        chapterNumber: signal(1),
        chapterData: signal(null),
        decorateVerses: vi.fn(() => "decoration"),
        removeDecoration: vi.fn(),
      },
    } as unknown as ReaderTab;
    renderPopover(
      createPlayingState(
        [
          playlist([
            {
              ...noted,
              note: '<p>See <a class="sb-verse-reference-link" href="#">Romans 5:8</a></p>',
            },
          ]),
        ],
        tab
      )
    );
    await waitFor(
      () => !!popover()?.querySelector("a.sb-verse-reference-link")
    );
    expect(popover()!.querySelector(".sb-tour-arrow-right")).not.toBeNull();

    await act(async () => {
      popover()!
        .querySelector<HTMLAnchorElement>("a.sb-verse-reference-link")!
        .click();
    });

    await waitFor(() =>
      popover()!.classList.contains("sb-scripture-note-popover--docked")
    );
    expect(popover()!.querySelector(".sb-tour-arrow")).toBeNull();
    expect(button("Back to playlist")).toBeDefined();
  });

  it("disables next on the last step of a queue that can't finish", async () => {
    layOutReader({ 16: 140, 17: 180 });
    renderPopover(createPlayingState([playlist([noted])]));
    await waitFor(() => !!popover());

    expect(button("Next")!.disabled).toBe(true);
  });
});

describe("a scripture reference inside a note", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const linked: PlaylistItemData = {
    type: "bible-verse",
    ref: { bookId: "JHN", chapter: 3, verse: 16 },
    note: '<p>Compare <a class="sb-verse-reference-link" href="/en/BSB/romans/5?verse=8">Romans 5:8</a>.</p>',
  };

  /**
   * A reader tab the playing state can move. jsdom has no reader, so this
   * stands in for the reading state: it records where it was sent.
   */
  function fakeTab() {
    const selectTranslationAndChapter = vi.fn(async () => {});
    const tab = {
      id: "tab-1",
      readingState: {
        selectTranslationAndChapter,
        translationId: signal("BSB"),
        bookId: signal<string | null>(null),
        chapterNumber: signal(1),
        chapterData: signal(null),
        decorateVerses: vi.fn(() => "decoration"),
        removeDecoration: vi.fn(),
      },
    } as unknown as ReaderTab;
    return { tab, selectTranslationAndChapter };
  }

  async function renderSheet() {
    const { tab, selectTranslationAndChapter } = fakeTab();
    const playing = createPlayingState([playlist([linked, plain])], tab);
    await act(() => playing.jumpTo(0));
    act(() => {
      render(
        <ScriptureNoteSheet
          playing={playing}
          resolveBookName={resolveBookName}
        />,
        container
      );
    });
    await waitFor(() => !!container.querySelector("a.sb-verse-reference-link"));
    selectTranslationAndChapter.mockClear();
    return { playing, selectTranslationAndChapter };
  }

  const backButton = () =>
    Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "playlist_playBack to playlist"
    );

  it("takes the reader there without leaving the playlist", async () => {
    const { playing, selectTranslationAndChapter } = await renderSheet();
    const link = container.querySelector<HTMLAnchorElement>(
      "a.sb-verse-reference-link"
    )!;

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => {
      link.dispatchEvent(click);
    });

    // The link isn't followed — that's what used to end playback.
    expect(click.defaultPrevented).toBe(true);
    expect(selectTranslationAndChapter).toHaveBeenCalledWith("BSB", "ROM", 5, {
      scrollToVerse: 8,
    });
    expect(playing.currentIndex.value).toBe(0);
    expect(container.querySelector(".sb-scripture-note-body")).not.toBeNull();
    expect(backButton()).toBeDefined();
  });

  it("returns to the step's passage from Back to playlist", async () => {
    const { playing, selectTranslationAndChapter } = await renderSheet();
    await act(async () => {
      container
        .querySelector<HTMLAnchorElement>("a.sb-verse-reference-link")!
        .click();
    });
    selectTranslationAndChapter.mockClear();

    await act(async () => backButton()!.click());

    expect(selectTranslationAndChapter).toHaveBeenCalledWith("BSB", "JHN", 3, {
      scrollToVerse: 16,
    });
    expect(playing.awayFromStep.value).toBe(false);
    expect(backButton()).toBeUndefined();
  });

  it("keeps Back to playlist reachable with the note collapsed", async () => {
    await renderSheet();
    await act(async () => {
      container
        .querySelector<HTMLAnchorElement>("a.sb-verse-reference-link")!
        .click();
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-scripture-note-sheet-header")!
        .click();
    });

    expect(container.querySelector(".sb-scripture-note-body")).toBeNull();
    expect(backButton()).toBeDefined();
  });

  it("is no longer away once playback moves to another step", async () => {
    const { playing } = await renderSheet();
    await act(async () => {
      container
        .querySelector<HTMLAnchorElement>("a.sb-verse-reference-link")!
        .click();
    });

    await act(() => playing.next());

    expect(playing.awayFromStep.value).toBe(false);
  });
});
