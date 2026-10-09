import { render } from "preact";
import { act } from "preact/test-utils";
import { useRef } from "preact/hooks";
import type { VerseDecoration } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import { OffscreenHighlightCueLayer } from "@packages/seed-bible/seed-bible/components/BibleReader/OffscreenHighlightCueLayer";
import {
  collectHighlightCueMarks,
  highlightCueStyle,
  horizontalScrollEdges,
  placeOffscreenHighlightCues,
  type HighlightCueMark,
  type MeasuredHighlightMark,
} from "@packages/seed-bible/seed-bible/components/BibleReader/offscreenHighlightCues";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const VIEWPORT = { top: 100, bottom: 500 };

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
    showSavedHighlights: true,
  };

  it("expands a saved range and lets a decoration highlight replace it", () => {
    const decoration: VerseDecoration = {
      id: "shared-highlight:GEN:28:2",
      translationId: null,
      bookId: "GEN",
      chapterNumber: 28,
      verses: [2],
      highlight: { colorId: "yellow" },
    };
    const marks = collectHighlightCueMarks({
      ...chapter,
      highlights: [{ verse: [1, 2], colorId: "green" }],
      decorations: [decoration],
    });

    expect(marks.map((item) => [item.verse, item.styleKey])).toEqual([
      [1, "preset:green"],
      [2, "preset:yellow"],
    ]);
  });

  it("keeps a peer highlight when saved highlights are hidden", () => {
    const marks = collectHighlightCueMarks({
      ...chapter,
      showSavedHighlights: false,
      highlights: [{ verse: 1, colorId: "green" }],
      decorations: [
        {
          id: "shared",
          translationId: "BSB",
          bookId: "GEN",
          chapterNumber: 28,
          verses: [4],
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
      highlights: [],
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
      highlights: [],
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
    20: { top: 900, bottom: 960 },
    21: { top: 960, bottom: 1020 },
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
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

  function renderCues(marks: HighlightCueMark[]) {
    act(() => {
      render(<CueHarness marks={marks} boxes={boxes} />, container);
    });
  }

  it("stacks an up bubble and a down bubble with the verse numbers", () => {
    renderCues([
      { verse: 1, ...highlightCueStyle({ colorId: "green" }) },
      { verse: 2, ...highlightCueStyle({ colorId: "green" }) },
      { verse: 10, ...highlightCueStyle({ colorId: "yellow" }) },
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }) },
      { verse: 21, ...highlightCueStyle({ colorId: "blue" }) },
    ]);

    const up = container.querySelector(".sb-offscreen-cues-up");
    const down = container.querySelector(".sb-offscreen-cues-down");
    expect(
      [...(up?.querySelectorAll(".sb-offscreen-cue-verse") ?? [])].map(
        (node) => node.textContent
      )
    ).toEqual(["1–2"]);
    expect(
      [...(down?.querySelectorAll(".sb-offscreen-cue-verse") ?? [])].map(
        (node) => node.textContent
      )
    ).toEqual(["20–21"]);
    expect(
      up?.querySelector(".sb-offscreen-cue")?.getAttribute("aria-label")
    ).toBe("Highlight above, verse 1–2. Show it");
    expect(
      down?.querySelector(".sb-offscreen-cue")?.getAttribute("aria-label")
    ).toBe("Highlight below, verse 20–21. Show it");
  });

  it("scrolls to the verse when the bubble is activated", () => {
    renderCues([{ verse: 1, ...highlightCueStyle({ colorId: "green" }) }]);
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
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }) },
      { verse: 21, ...highlightCueStyle({ colorId: "green" }) },
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
    renderCues([{ verse: 20, ...highlightCueStyle({ colorId: "blue" }) }]);
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
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }) },
      { verse: 21, ...highlightCueStyle({ colorId: "green" }) },
    ];
    renderCues(marks);
    const verseLookups = () =>
      query.mock.calls.filter(
        (call) => call[0] === ".sb-verse[data-verse-number]"
      ).length;
    expect(verseLookups()).toBe(1);

    act(() => {
      render(<CueHarness marks={[...marks]} boxes={boxes} />, container);
    });
    expect(verseLookups()).toBe(1);
    query.mockRestore();
  });

  it("shows a scroll arrow only on a side that can still move", () => {
    renderCues([
      { verse: 20, ...highlightCueStyle({ colorId: "blue" }) },
      { verse: 21, ...highlightCueStyle({ colorId: "green" }) },
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
