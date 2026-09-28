import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ResumeReadingSection } from "@packages/seed-bible/seed-bible/components/TodayPane/ResumeReadingSection";
import type { ReadingHistoryState } from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";
import { todayStub } from "../../testUtils/todayStubs";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

describe("ResumeReadingSection", () => {
  let container: HTMLDivElement;
  const onOpenPassage = vi.fn();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(
    options: {
      status?: ReadingHistoryState["status"];
      lastReading?: { bookId: string; chapter: number };
      bookNames?: Map<string, string>;
    } = {}
  ) {
    const status = options.status ?? "ready";
    const readingHistory =
      status === "ready"
        ? signal<ReadingHistoryState>({
            status: "ready",
            lastReading: options.lastReading ?? { bookId: "GEN", chapter: 1 },
          })
        : signal<ReadingHistoryState>({ status });
    const today = todayStub({
      readingHistory,
      bookNames: signal(options.bookNames ?? new Map([["GEN", "Genesis"]])),
    });
    act(() =>
      render(
        <ResumeReadingSection today={today} onOpenPassage={onOpenPassage} />,
        container
      )
    );
  }

  const q = (sel: string) => container.querySelector(sel);
  const card = () =>
    q(".sb-today-resume-card:not(.sb-today-resume-card--loading)");
  const button = () =>
    container.querySelector<HTMLButtonElement>(".sb-today-resume-card button")!;

  describe("while reading history loads", () => {
    it("renders a placeholder instead of a card", () => {
      setup({ status: "loading" });
      expect(q(".sb-today-resume-card--loading")).not.toBeNull();
      expect(card()).toBeNull();
    });

    it("announces the placeholder to screen readers", () => {
      setup({ status: "loading" });
      const placeholder = q(".sb-today-resume-card--loading")!;
      expect(placeholder.getAttribute("role")).toBe("status");
      expect(placeholder.querySelector(".sr-only")!.textContent).toBe(
        "Loading your reading history…"
      );
    });

    it("offers nothing to click", () => {
      setup({ status: "loading" });
      expect(q(".sb-today-resume-card button")).toBeNull();
      expect(onOpenPassage).not.toHaveBeenCalled();
    });
  });

  describe("once a resume position is known", () => {
    it("renders the card title", () => {
      setup();
      expect(card()!.querySelector(":scope > span")!.textContent).toBe(
        "CONTINUE WHERE YOU LEFT OFF"
      );
    });

    it("resolves the book name and chapter from the last reading", () => {
      setup({ lastReading: { bookId: "GEN", chapter: 7 } });
      expect(card()!.querySelector("h1")!.textContent).toBe("Genesis 7");
    });

    it("falls back to the bookId when the name is unknown", () => {
      setup({
        lastReading: { bookId: "XYZ", chapter: 1 },
        bookNames: new Map(),
      });
      expect(card()!.querySelector("h1")!.textContent).toBe("XYZ 1");
    });

    it("renders the forward arrow on the button", () => {
      setup();
      expect(
        button().querySelector(".material-symbols-outlined")!.textContent
      ).toBe("arrow_right_alt");
    });

    it("opens the last reading on click, letting the default translation apply", () => {
      setup({ lastReading: { bookId: "JHN", chapter: 3 } });

      act(() => button().click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "JHN",
        chapter: 3,
      });
    });
  });
});
