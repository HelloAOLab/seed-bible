import { render } from "preact";
import { act } from "preact/test-utils";
import { useChapter } from "scriptureMap2D.hooks.useChapter";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useTestamentContext } from "scriptureMap2D.contexts.Testament.TestamentContext";

jest.mock(
  "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext",
  () => ({
    useScriptureMap2DContext: jest.fn(),
  })
);

jest.mock("scriptureMap2D.contexts.Testament.TestamentContext", () => ({
  useTestamentContext: jest.fn(),
}));

type ChapterProps = Parameters<typeof useChapter>[0];

function makeProps(overrides: Partial<ChapterProps> = {}): ChapterProps {
  return {
    sectionName: "Law",
    bookId: "GEN",
    index: 0,
    historyBackground: undefined,
    historyColor: undefined,
    borderGradientColors: undefined,
    ...overrides,
  };
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    isUserPresenceEnabled: false,
    isReadingHistoryEnabled: false,
    scaleFactor: 1,
    content: new Map(),
    mode: "Viewer",
    selection: undefined,
    project: undefined,
    projectFilters: new Map(),
    projectStateStyle: {},
    onChapterClick: jest.fn(),
    onChapterClickDependencies: [],
    onChapterClickAndHold: undefined,
    isInSelectionMode: false,
    ...overrides,
  };
}

function makeTestamentCtx(name = "OT") {
  return { testament: { name, sections: [] }, testamentIndex: 0 };
}

describe("useChapter", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(makeCtx());
    (useTestamentContext as jest.Mock).mockReturnValue(makeTestamentCtx());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function setup(props: Partial<ChapterProps> = {}) {
    const result = {
      current: null as unknown as ReturnType<typeof useChapter>,
    };
    function TestComponent() {
      result.current = useChapter(makeProps(props));
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("chapterClass", () => {
    it("is 'chapter' when no border gradient or user presence", () => {
      const result = setup();
      expect(result.current.chapterClass).toBe("chapter");
    });

    it("is 'chapter show-user-presence' when borderGradientColors and isUserPresenceEnabled", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ isUserPresenceEnabled: true })
      );
      const result = setup({ borderGradientColors: "linear-gradient(red)" });
      expect(result.current.chapterClass).toBe("chapter show-user-presence");
    });

    it("is 'chapter' when borderGradientColors present but isUserPresenceEnabled is false", () => {
      const result = setup({ borderGradientColors: "linear-gradient(red)" });
      expect(result.current.chapterClass).toBe("chapter");
    });
  });

  describe("tooltipOffsetY", () => {
    it("is 0 when isUserPresenceEnabled is false", () => {
      const result = setup({ borderGradientColors: "linear-gradient()" });
      expect(result.current.tooltipOffsetY).toBe(0);
    });

    it("is scaleFactor * 2 when isUserPresenceEnabled and borderGradientColors exist", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ isUserPresenceEnabled: true, scaleFactor: 3 })
      );
      const result = setup({ borderGradientColors: "linear-gradient()" });
      expect(result.current.tooltipOffsetY).toBe(6);
    });
  });

  describe("tooltipAnchor", () => {
    it("is undefined initially", () => {
      const result = setup();
      expect(result.current.tooltipAnchor).toBeUndefined();
    });

    it("is set when handleChapterPointerEnter is called", () => {
      const result = setup();
      const fakeEl = document.createElement("div");
      jest.spyOn(fakeEl, "getBoundingClientRect").mockReturnValue({
        left: 50,
        top: 100,
        width: 32,
        height: 32,
        right: 82,
        bottom: 132,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);
      act(() =>
        result.current.handleChapterPointerEnter({
          currentTarget: fakeEl,
        } as never)
      );
      expect(result.current.tooltipAnchor).toEqual({
        x: 66,
        y: 100,
        width: 32,
        height: 32,
      });
    });

    it("is cleared when handleChapterPointerLeave is called", () => {
      const result = setup();
      const fakeEl = document.createElement("div");
      jest.spyOn(fakeEl, "getBoundingClientRect").mockReturnValue({
        left: 50,
        top: 100,
        width: 32,
        height: 32,
        right: 82,
        bottom: 132,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);
      act(() =>
        result.current.handleChapterPointerEnter({
          currentTarget: fakeEl,
        } as never)
      );
      expect(result.current.tooltipAnchor).toBeDefined();
      act(() => result.current.handleChapterPointerLeave());
      expect(result.current.tooltipAnchor).toBeUndefined();
    });
  });

  describe("chapterStyle - Viewer mode", () => {
    it("sets background from historyBackground when Viewer mode and isReadingHistoryEnabled", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ isReadingHistoryEnabled: true, mode: "Viewer" })
      );
      const result = setup({ historyBackground: "#aabbcc" });
      expect(result.current.chapterStyle.background).toBe("#aabbcc");
    });

    it("background is undefined when isReadingHistoryEnabled is false", () => {
      const result = setup({ historyBackground: "#aabbcc" });
      expect(result.current.chapterStyle.background).toBeUndefined();
    });

    it("sets borderStyle to 'hidden' in Viewer mode", () => {
      const result = setup();
      expect(result.current.chapterStyle.borderStyle).toBe("hidden");
    });
  });

  describe("chapterStyle - Project mode", () => {
    const projectStateStyle = {
      Completed: {
        backgroundColor: "#87eb72",
        borderColor: "#87eb72",
        borderStyle: "solid",
      },
      Assigned: {
        backgroundColor: "#dfdede",
        borderColor: "grey",
        borderStyle: "dashed",
      },
    };

    it("applies projectStateStyle colors when hasProjectContent and projectChapterState defined", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Project",
          isInSelectionMode: true,
          project: { structure: { OT: { Law: { GEN: ["Completed"] } } } },
          projectFilters: new Map([["Completed", true]]),
          projectStateStyle,
        })
      );
      // selection undefined → checked = false → uses style colors
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.background).toBe("#87eb72");
      expect(result.current.chapterStyle.borderStyle).toBe("solid");
      expect(result.current.chapterStyle.borderColor).toBe("#87eb72");
    });

    it("uses solid border and green color when checked=true (overrides style)", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Project",
          isInSelectionMode: true,
          project: { structure: { OT: { Law: { GEN: ["Assigned"] } } } },
          projectFilters: new Map([["Assigned", true]]),
          projectStateStyle,
          selection: { OT: { Law: { GEN: [true] } } },
        })
      );
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.borderStyle).toBe("solid");
      expect(result.current.chapterStyle.borderColor).toBe("#2AB80D");
    });

    it("uses empty style when no projectChapterState for the chapter", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Project",
          isInSelectionMode: true,
          project: { structure: {} }, // no structure for testament
          projectFilters: new Map(),
          projectStateStyle,
          selection: { OT: { Law: { GEN: [true] } } }, // checked=true to enter the if
        })
      );
      // projectChapterState = undefined → style = {} → background = undefined
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.background).toBeUndefined();
      // checked=true overrides border
      expect(result.current.chapterStyle.borderStyle).toBe("solid");
      expect(result.current.chapterStyle.borderColor).toBe("#2AB80D");
    });

    it("does not apply style when hasProjectContent is false and checked is false", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Project",
          isInSelectionMode: false,
          project: { structure: {} }, // projectChapterState = undefined → filter fails
          projectFilters: new Map([["Completed", true]]),
          projectStateStyle,
        })
      );
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.background).toBeUndefined();
      expect(result.current.chapterStyle.borderStyle).toBeUndefined();
    });

    it("applies style when projectFilters allows the chapter state", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Project",
          isInSelectionMode: false,
          project: { structure: { OT: { Law: { GEN: ["Assigned"] } } } },
          projectFilters: new Map([["Assigned", true]]),
          projectStateStyle,
        })
      );
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.background).toBe("#dfdede");
    });

    it("does not apply style when projectFilter blocks the chapter state", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Project",
          isInSelectionMode: false,
          project: { structure: { OT: { Law: { GEN: ["Assigned"] } } } },
          projectFilters: new Map([["Assigned", false]]),
          projectStateStyle,
        })
      );
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.background).toBeUndefined();
    });
  });

  describe("chapterStyle - Checkbox mode", () => {
    it("sets borderColor to '#2AB80D' when checked is true", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({
          mode: "Checkbox",
          selection: { OT: { Law: { GEN: [true] } } },
        })
      );
      const result = setup({ sectionName: "Law", bookId: "GEN", index: 0 });
      expect(result.current.chapterStyle.borderColor).toBe("#2AB80D");
    });

    it("borderColor is undefined when checked is false", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ mode: "Checkbox" })
      );
      const result = setup();
      expect(result.current.chapterStyle.borderColor).toBeUndefined();
    });
  });

  describe("isReadingHistoryEnabled / isUserPresenceEnabled passthrough", () => {
    it("returns isUserPresenceEnabled from context", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ isUserPresenceEnabled: true })
      );
      const result = setup();
      expect(result.current.isUserPresenceEnabled).toBe(true);
    });

    it("returns isReadingHistoryEnabled from context", () => {
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ isReadingHistoryEnabled: true })
      );
      const result = setup();
      expect(result.current.isReadingHistoryEnabled).toBe(true);
    });
  });

  describe("handleChapterPointerDown / Up (click-and-hold)", () => {
    it("calls onChapterClick when released before holdTime (400ms)", () => {
      const onChapterClick = jest.fn();
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ onChapterClick })
      );
      const result = setup();
      const fakeEvent = { stopPropagation: jest.fn() } as never;
      act(() => result.current.handleChapterPointerDown(fakeEvent));
      act(() => jest.advanceTimersByTime(200));
      act(() => result.current.handleChapterPointerUp(fakeEvent));
      expect(onChapterClick).toHaveBeenCalledTimes(1);
    });

    it("calls onChapterClickAndHold when held for 400ms", () => {
      const onChapterClickAndHold = jest.fn();
      (useScriptureMap2DContext as jest.Mock).mockReturnValue(
        makeCtx({ onChapterClickAndHold })
      );
      const result = setup();
      const fakeEvent = { stopPropagation: jest.fn() } as never;
      act(() => result.current.handleChapterPointerDown(fakeEvent));
      act(() => jest.advanceTimersByTime(400));
      expect(onChapterClickAndHold).toHaveBeenCalledTimes(1);
    });
  });
});
