import { render } from "preact";
import { act } from "preact/test-utils";
import { useRef } from "preact/hooks";
import type { VerseDecoration } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  CUE_NOTIFY_MS,
  OffscreenHighlightCueLayer,
} from "@packages/seed-bible/seed-bible/components/BibleReader/OffscreenHighlightCueLayer";
import {
  collectHighlightCueMarks,
  highlightCueStyle,
  horizontalScrollEdges,
  placeOffscreenHighlightCues,
  type HighlightCueAuthor,
  type HighlightCueMark,
  type MeasuredHighlightMark,
} from "@packages/seed-bible/seed-bible/components/BibleReader/offscreenHighlightCues";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const VIEWPORT = { top: 100, bottom: 500 };

function author(
  name: string,
  imageUrl: string | null = null
): HighlightCueAuthor {
  return {
    key: `user-${name}`,
    displayName: name,
    imageUrl,
    visual: { defaultIcon: "forest", color: "#34D399", colorName: "emerald" },
  };
}

function mark(
  verse: number,
  top: number,
  bottom: number,
  colorId = "green"
): MeasuredHighlightMark {
  return {
    verse,
    top,
    bottom,
    ...highlightCueStyle({ colorId }),
    author: null,
  };
}

describe("placeOffscreenHighlightCues", () => {
  it("points up for a highlight above the reader and down for one below", () => {
    const placed = placeOffscreenHighlightCues(
      [mark(2, 0, 40), mark(8, 200, 260), mark(14, 700, 760)],
      VIEWPORT
    );

    expect(placed.up.map((cue) => cue.label)).toEqual(["2"]);
    expect(placed.up[0]?.direction).toBe("up");
    expect(placed.down.map((cue) => cue.label)).toEqual(["14"]);
    expect(placed.down[0]?.direction).toBe("down");
    expect(placed.up[0]?.background).toContain("--sb-highlight-green-color");
  });

  it("hides a highlight that is even partly on screen", () => {
    const placed = placeOffscreenHighlightCues(
      [mark(4, 80, 140), mark(5, 460, 520)],
      VIEWPORT
    );
    expect(placed.up).toEqual([]);
    expect(placed.down).toEqual([]);
  });

  it("collapses consecutive verses of the same colour into one range", () => {
    const placed = placeOffscreenHighlightCues(
      [
        mark(1, 0, 20),
        mark(2, 20, 40),
        mark(3, 40, 60),
        mark(9, 800, 840, "blue"),
        mark(10, 840, 880, "blue"),
        mark(12, 900, 940, "blue"),
      ],
      VIEWPORT
    );

    expect(placed.up.map((cue) => cue.label)).toEqual(["1–3"]);
    expect(placed.up[0]?.verse).toBe(1);
    expect(placed.down.map((cue) => cue.label)).toEqual(["9–10", "12"]);
  });

  it("keeps highlights by different people in separate bubbles", () => {
    const placed = placeOffscreenHighlightCues(
      [
        { ...mark(1, 0, 20), author: author("Ana") },
        { ...mark(2, 20, 40), author: author("Ana") },
        { ...mark(3, 40, 60), author: author("Ben") },
      ],
      VIEWPORT
    );
    expect(
      placed.up.map((cue) => [cue.label, cue.author?.displayName])
    ).toEqual([
      ["1–2", "Ana"],
      ["3", "Ben"],
    ]);
  });

  it("does not merge a run across a verse that is on screen", () => {
    const placed = placeOffscreenHighlightCues(
      [mark(1, 0, 20), mark(2, 200, 240), mark(3, 0, 20)],
      VIEWPORT
    );
    expect(placed.up.map((cue) => cue.label)).toEqual(["1", "3"]);
  });

  it("ignores a verse that has not been laid out", () => {
    const placed = placeOffscreenHighlightCues(
      [mark(1, 0, 0), mark(2, 0, 20)],
      VIEWPORT
    );
    expect(placed.up.map((cue) => cue.label)).toEqual(["2"]);
  });
});

describe("horizontalScrollEdges", () => {
  it("shows no arrows when the row fits", () => {
    expect(horizontalScrollEdges(0, 120, 120)).toEqual({
      left: false,
      right: false,
    });
  });

  it("shows only the side that still has more circles", () => {
    expect(horizontalScrollEdges(0, 400, 100)).toEqual({
      left: false,
      right: true,
    });
    expect(horizontalScrollEdges(40, 400, 100)).toEqual({
      left: true,
      right: true,
    });
    expect(horizontalScrollEdges(300, 400, 100)).toEqual({
      left: true,
      right: false,
    });
  });
});

describe("collectHighlightCueMarks", () => {
  const chapter = {
    translationId: "BSB",
    bookId: "GEN",
    chapterNumber: 28,
  };

  function decoration(
    id: string,
    verses: number[],
    colorId: string
  ): VerseDecoration {
    return {
      id,
      translationId: null,
      bookId: "GEN",
      chapterNumber: 28,
      verses,
      highlight: { colorId },
    };
  }

  it("credits each highlight to whoever added it and leaves out the reader's own", () => {
    const marks = collectHighlightCueMarks({
      ...chapter,
      decorations: [
        decoration("from-ben", [3], "yellow"),
        decoration("from-extension", [5], "blue"),
        decoration("mine", [7], "green"),
        // Painted over Ben's verse later, but it's the reader's own, so Ben's
        // highlight is still the one that notifies.
        decoration("mine-too", [3], "pink"),
      ],
      isOwnDecoration: (id) => id.startsWith("mine"),
      decorationAuthor: (id) => (id === "from-ben" ? author("Ben") : null),
    });

    expect(
      marks.map((item) => [
        item.verse,
        item.styleKey,
        item.author?.displayName ?? null,
      ])
    ).toEqual([
      [3, "preset:yellow", "Ben"],
      [5, "preset:blue", null],
    ]);
  });

  it("lets a later highlight on the same verse replace an earlier one", () => {
    const marks = collectHighlightCueMarks({
      ...chapter,
      decorations: [
        decoration("first", [1, 2], "green"),
        decoration("second", [2], "yellow"),
      ],
    });

    expect(marks.map((item) => [item.verse, item.styleKey])).toEqual([
      [1, "preset:green"],
      [2, "preset:yellow"],
    ]);
  });

  it("paints a custom-coloured highlight in its own colours", () => {
    const marks = collectHighlightCueMarks({
      ...chapter,
      decorations: [
        {
          ...decoration("shared", [4], "green"),
          translationId: "BSB",
          highlight: { colorId: "green", customColor: "#a5d6a7" },
        },
      ],
    });

    expect(marks).toHaveLength(1);
    expect(marks[0]?.verse).toBe(4);
    expect(marks[0]?.background).toBe("#a5d6a7");
    expect(marks[0]?.textColor).toBe("#333333");
  });

  it("skips highlights that are not in this chapter or only cover a text fragment", () => {
    const marks = collectHighlightCueMarks({
      ...chapter,
      decorations: [
        {
          id: "other-chapter",
          translationId: null,
          bookId: "GEN",
          chapterNumber: 27,
          verses: [1],
          highlight: { colorId: "green" },
        },
        {
          id: "fragment",
          translationId: null,
          bookId: "GEN",
          chapterNumber: 28,
          verses: [3],
          targetContent: "Canaanite",
          highlight: { colorId: "green" },
        },
      ],
    });
    expect(marks).toEqual([]);
  });

  it("skips a decoration verse that is not a whole verse number", () => {
    const marks = collectHighlightCueMarks({
      ...chapter,
      decorations: [
        {
          id: "bad-verses",
          translationId: null,
          bookId: "GEN",
          chapterNumber: 28,
          verses: [0, 1.5, 3],
          highlight: { colorId: "green" },
        },
      ],
    });
    expect(marks.map((item) => item.verse)).toEqual([3]);
  });
});

function domRect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 320,
    width: 320,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function CueHarness({
  marks,
  boxes,
}: {
  marks: HighlightCueMark[];
  boxes: Record<number, { top: number; bottom: number }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="cue-content">
      {Object.keys(boxes).map((verse) => (
        <div key={verse} className="sb-verse" data-verse-number={verse} />
      ))}
      <OffscreenHighlightCueLayer contentRef={ref} marks={marks} />
    </div>
  );
}

describe("OffscreenHighlightCueLayer", () => {
  let container: HTMLDivElement;
  let rectSpy: ReturnType<typeof vi.spyOn>;
  const boxes: Record<number, { top: number; bottom: number }> = {
    1: { top: -80, bottom: -40 },
    2: { top: -40, bottom: -4 },
    10: { top: 200, bottom: 260 },
    15: { top: 660, bottom: 690 },
    20: { top: 900, bottom: 960 },
    21: { top: 960, bottom: 1020 },
    22: { top: 1020, bottom: 1080 },
    23: { top: 1080, bottom: 1140 },
  };
  // Frames run when flushed, as a browser runs them after the current task,
  // rather than inside the call that requested them.
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
    rectSpy = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: Element) {
        const el = this as HTMLElement;
        const verse = el.dataset.verseNumber;
        if (verse && boxes[Number(verse)]) {
          const box = boxes[Number(verse)]!;
          return domRect(box.top, box.bottom);
        }
        if (el.classList.contains("cue-content")) return domRect(0, 4000);
        return domRect(0, 0);
      });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    rectSpy.mockRestore();
    vi.mocked(window.requestAnimationFrame).mockRestore();
  });

  function flushFrames() {
    while (frames.length > 0) {
      const due = frames;
      frames = [];
      act(() => {
        for (const frame of due) frame(0);
      });
    }
  }

  function renderCues(marks: HighlightCueMark[]) {
    act(() => {
      render(<CueHarness marks={marks} boxes={boxes} />, container);
    });
    flushFrames();
  }

  function cue(verse: number, colorId: string): HighlightCueMark {
    return { verse, ...highlightCueStyle({ colorId }), author: null };
  }

  function hover(el: Element, type: "pointerenter" | "pointerleave") {
    act(() => {
      el.dispatchEvent(new PointerEvent(type, { pointerType: "mouse" }));
    });
  }

  it("reaches right down to the toolbar, past the gap kept above it", () => {
    const root = document.documentElement.style;
    // The toolbar covers 100px; the inset adds the 48px gap kept above it.
    root.setProperty("--sb-reader-bottom-inset", "148px");
    root.setProperty("--sb-reader-bottom-chrome", "100px");
    try {
      renderCues([cue(15, "green"), cue(20, "blue")]);

      expect(
        container.querySelector<HTMLElement>(".sb-offscreen-cues")?.style.height
      ).toBe("700px");
      // Verse 15 sits in that gap, which is on screen.
      expect(
        [...container.querySelectorAll(".sb-offscreen-cue")].map((pill) =>
          pill.getAttribute("data-verse")
        )
      ).toEqual(["20"]);
    } finally {
      root.removeProperty("--sb-reader-bottom-inset");
      root.removeProperty("--sb-reader-bottom-chrome");
    }
  });

  describe("collapsing into the corner indicator", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const collapse = () =>
      act(() => {
        vi.advanceTimersByTime(CUE_NOTIFY_MS);
      });

    it("shows the pills for a new highlight, then collapses them into an indicator", () => {
      renderCues([
        cue(1, "green"),
        cue(2, "yellow"),
        cue(20, "blue"),
        cue(21, "yellow"),
        cue(22, "green"),
        cue(23, "pink"),
      ]);
      expect(container.querySelectorAll(".sb-offscreen-cue")).toHaveLength(6);
      expect(container.querySelector(".sb-offscreen-cue-indicator")).toBeNull();

      act(() => {
        vi.advanceTimersByTime(CUE_NOTIFY_MS - 1);
      });
      expect(container.querySelectorAll(".sb-offscreen-cue")).toHaveLength(6);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(container.querySelector(".sb-offscreen-cue")).toBeNull();

      const iconVerses = (selector: string) =>
        [
          ...container.querySelectorAll(
            `${selector} .sb-offscreen-cue-indicator-icon`
          ),
        ].map((icon) => icon.getAttribute("data-verse"));
      // Nearest first, and no more than three.
      expect(iconVerses(".sb-offscreen-cue-indicator-up")).toEqual(["2", "1"]);
      expect(iconVerses(".sb-offscreen-cue-indicator-down")).toEqual([
        "20",
        "21",
        "22",
      ]);
      expect(
        container
          .querySelector(".sb-offscreen-cue-indicator-up")
          ?.getAttribute("aria-label")
      ).toBe("Highlight above, verse 2. Show it");
    });

    it("opens the pills while the indicator is hovered", () => {
      renderCues([cue(20, "blue"), cue(21, "yellow")]);
      collapse();
      const indicator = container.querySelector(".sb-offscreen-cue-indicator")!;

      hover(indicator, "pointerenter");
      expect(
        [
          ...container.querySelectorAll(
            ".sb-offscreen-cues-down .sb-offscreen-cue-text"
          ),
        ].map((node) => node.textContent)
      ).toEqual(["Highlighted verse 20", "Highlighted verse 21"]);

      // Crossing from the indicator onto the pills keeps them open.
      hover(indicator, "pointerleave");
      hover(
        container.querySelector(".sb-offscreen-cues-down")!,
        "pointerenter"
      );
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector(".sb-offscreen-cue")).not.toBeNull();

      hover(
        container.querySelector(".sb-offscreen-cues-down")!,
        "pointerleave"
      );
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector(".sb-offscreen-cue")).toBeNull();
      expect(
        container.querySelector(".sb-offscreen-cue-indicator")
      ).not.toBeNull();
    });

    it("scrolls to the nearest highlight when the indicator is clicked", () => {
      renderCues([cue(1, "green"), cue(2, "yellow"), cue(20, "blue")]);
      collapse();
      const verseOne = container.querySelector<HTMLElement>(
        '.sb-verse[data-verse-number="1"]'
      )!;
      const verseTwo = container.querySelector<HTMLElement>(
        '.sb-verse[data-verse-number="2"]'
      )!;
      verseOne.scrollIntoView = vi.fn();
      verseTwo.scrollIntoView = vi.fn();

      act(() => {
        container
          .querySelector<HTMLButtonElement>(".sb-offscreen-cue-indicator-up")!
          .click();
      });
      expect(verseTwo.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(verseOne.scrollIntoView).not.toHaveBeenCalled();
    });

    it("opens the pills again only for a new highlight that lands off screen", () => {
      renderCues([cue(20, "blue")]);
      collapse();

      // Painted on the verse being read: no notice.
      renderCues([cue(10, "green"), cue(20, "blue")]);
      expect(container.querySelector(".sb-offscreen-cue")).toBeNull();

      renderCues([cue(10, "green"), cue(20, "blue"), cue(22, "pink")]);
      expect(container.querySelectorAll(".sb-offscreen-cue")).toHaveLength(2);
      expect(container.querySelector(".sb-offscreen-cue-indicator")).toBeNull();
    });
  });

  it("shows an up bubble and a down bubble with the highlighted verses", () => {
    renderCues([
      { verse: 1, ...highlightCueStyle({ colorId: "green" }), author: null },
      { verse: 2, ...highlightCueStyle({ colorId: "green" }), author: null },
      { verse: 10, ...highlightCueStyle({ colorId: "yellow" }), author: null },
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }), author: null },
      { verse: 21, ...highlightCueStyle({ colorId: "blue" }), author: null },
    ]);

    const up = container.querySelector(".sb-offscreen-cues-up");
    const down = container.querySelector(".sb-offscreen-cues-down");
    expect(
      [...(up?.querySelectorAll(".sb-offscreen-cue-text") ?? [])].map(
        (node) => node.textContent
      )
    ).toEqual(["Highlighted verses 1–2"]);
    expect(
      [...(down?.querySelectorAll(".sb-offscreen-cue-text") ?? [])].map(
        (node) => node.textContent
      )
    ).toEqual(["Highlighted verses 20–21"]);
    expect(
      up?.querySelector(".sb-offscreen-cue")?.getAttribute("aria-label")
    ).toBe("Highlight above, verse 1–2. Show it");
    expect(
      down?.querySelector(".sb-offscreen-cue")?.getAttribute("aria-label")
    ).toBe("Highlight below, verse 20–21. Show it");
  });

  it("shows the avatar of whoever made the highlight", () => {
    renderCues([
      {
        verse: 1,
        ...highlightCueStyle({ colorId: "green" }),
        author: author("Ana", "https://example.com/ana.png"),
      },
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }), author: null },
    ]);

    const up = container.querySelector(".sb-offscreen-cues-up");
    const avatar = up?.querySelector<HTMLElement>(
      ".sb-offscreen-cue-avatar .sb-tab-user-icon"
    );
    expect(avatar?.getAttribute("title")).toBe("Ana");
    expect(avatar?.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/ana.png"
    );
    expect(up?.querySelector(".sb-offscreen-cue-text")?.textContent).toBe(
      "Highlighted verse 1"
    );

    const down = container.querySelector(".sb-offscreen-cues-down");
    expect(down?.querySelector(".sb-offscreen-cue-avatar")).toBeNull();
  });

  it("scrolls to the verse when the bubble is activated", () => {
    renderCues([
      { verse: 1, ...highlightCueStyle({ colorId: "green" }), author: null },
    ]);
    const verse = container.querySelector<HTMLElement>(
      '.sb-verse[data-verse-number="1"]'
    )!;
    const scroll = vi.fn();
    verse.scrollIntoView = scroll;

    act(() => {
      container.querySelector<HTMLButtonElement>(".sb-offscreen-cue")?.click();
    });

    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" })
    );
  });

  it("drags through the stack without jumping to the verse", () => {
    renderCues([
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }), author: null },
      { verse: 21, ...highlightCueStyle({ colorId: "green" }), author: null },
    ]);
    const verse = container.querySelector<HTMLElement>(
      '.sb-verse[data-verse-number="20"]'
    )!;
    verse.scrollIntoView = vi.fn();
    const button =
      container.querySelector<HTMLButtonElement>(".sb-offscreen-cue")!;
    const stack = container.querySelector<HTMLElement>(
      ".sb-offscreen-cues-down .sb-offscreen-cues-stack"
    )!;

    act(() => {
      button.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 100,
          pointerId: 1,
        })
      );
      stack.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          button: 0,
          clientX: 40,
          pointerId: 1,
        })
      );
      button.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          button: 0,
          clientX: 40,
          pointerId: 1,
        })
      );
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 1 })
      );
    });

    expect(verse.scrollIntoView).not.toHaveBeenCalled();
  });

  it("still jumps from the keyboard after a drag that never clicked", async () => {
    renderCues([
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }), author: null },
    ]);
    const verse = container.querySelector<HTMLElement>(
      '.sb-verse[data-verse-number="20"]'
    )!;
    const scroll = vi.fn();
    verse.scrollIntoView = scroll;
    const button =
      container.querySelector<HTMLButtonElement>(".sb-offscreen-cue")!;
    const stack = container.querySelector<HTMLElement>(
      ".sb-offscreen-cues-down .sb-offscreen-cues-stack"
    )!;

    act(() => {
      button.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 100,
          pointerId: 1,
        })
      );
      stack.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          button: 0,
          clientX: 40,
          pointerId: 1,
        })
      );
      stack.dispatchEvent(
        new PointerEvent("pointercancel", {
          bubbles: true,
          pointerId: 1,
        })
      );
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 0 })
      );
    });
    expect(scroll).toHaveBeenCalledTimes(1);

    scroll.mockClear();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    act(() => {
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 1 })
      );
    });
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it("looks up the verse elements once while the same verses stay on screen", () => {
    const query = vi.spyOn(Element.prototype, "querySelectorAll");
    const marks = [
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }), author: null },
      { verse: 21, ...highlightCueStyle({ colorId: "green" }), author: null },
    ];
    renderCues(marks);
    const verseLookups = () =>
      query.mock.calls.filter(
        (call) => call[0] === ".sb-verse[data-verse-number]"
      ).length;
    expect(verseLookups()).toBe(1);

    renderCues([...marks]);
    expect(verseLookups()).toBe(1);
    query.mockRestore();
  });

  it("shows a scroll arrow only on a side that can still move", () => {
    renderCues([
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }), author: null },
      { verse: 21, ...highlightCueStyle({ colorId: "green" }), author: null },
    ]);
    const row = container.querySelector(".sb-offscreen-cues-down")!;
    const stack = row.querySelector<HTMLElement>(".sb-offscreen-cues-stack")!;
    expect(row.querySelector(".sb-offscreen-cues-scroll")).toBeNull();

    const metrics = { scrollWidth: 400, clientWidth: 80, scrollLeft: 0 };
    Object.defineProperty(stack, "scrollWidth", {
      configurable: true,
      get: () => metrics.scrollWidth,
    });
    Object.defineProperty(stack, "clientWidth", {
      configurable: true,
      get: () => metrics.clientWidth,
    });
    Object.defineProperty(stack, "scrollLeft", {
      configurable: true,
      get: () => metrics.scrollLeft,
      set: (value: number) => {
        metrics.scrollLeft = value;
      },
    });

    act(() => {
      stack.dispatchEvent(new Event("scroll"));
    });
    expect(row.querySelector(".sb-offscreen-cues-scroll-left")).toBeNull();
    expect(
      row
        .querySelector(".sb-offscreen-cues-scroll-right")
        ?.getAttribute("aria-label")
    ).toBe("More highlights to the right");

    act(() => {
      row
        .querySelector<HTMLButtonElement>(".sb-offscreen-cues-scroll-right")
        ?.click();
    });
    expect(metrics.scrollLeft).toBe(metrics.scrollWidth - metrics.clientWidth);
    expect(row.querySelector(".sb-offscreen-cues-scroll-left")).not.toBeNull();
    expect(row.querySelector(".sb-offscreen-cues-scroll-right")).toBeNull();

    act(() => {
      row
        .querySelector<HTMLButtonElement>(".sb-offscreen-cues-scroll-left")
        ?.click();
    });
    expect(metrics.scrollLeft).toBe(0);
    expect(row.querySelector(".sb-offscreen-cues-scroll-left")).toBeNull();
    expect(row.querySelector(".sb-offscreen-cues-scroll-right")).not.toBeNull();
  });
});
