import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useResumeReadingSection } from "@packages/seed-bible/seed-bible/components/TodayPane/useResumeReadingSection";
import { useTodayContext } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayContext";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

const openPassage = vi.fn();

type Result = ReturnType<typeof useResumeReadingSection>;

describe("useResumeReadingSection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(options: {
    status?: "loading" | "ready";
    lastReading?: { bookId: string; chapter: number };
    bookNames?: Map<string, string>;
  }) {
    const status = options.status ?? "ready";
    const readingHistory =
      status === "ready"
        ? signal({
            status: "ready" as const,
            lastReading: options.lastReading ?? { bookId: "GEN", chapter: 1 },
          })
        : signal({ status: "loading" as const });
    (useTodayContext as Mock).mockReturnValue({
      readingHistory,
      bookNames: signal(options.bookNames ?? new Map([["GEN", "Genesis"]])),
      openPassage,
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useResumeReadingSection();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("reports a loading placeholder with no card data while loading", () => {
    const result = setup({ status: "loading" });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.cardData).toBeNull();
  });

  it("is not loading and has card data when ready", () => {
    const result = setup({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.cardData).not.toBeNull();
  });

  it("does nothing on button click while loading", () => {
    const result = setup({ status: "loading" });
    act(() => result.current.handleButtonClick());
    expect(openPassage).not.toHaveBeenCalled();
  });

  describe("cardData", () => {
    it("translates the resume title and uses a fixed button icon", () => {
      const result = setup({ lastReading: { bookId: "GEN", chapter: 3 } });
      expect(result.current.cardData?.title).toBe("CONTINUE WHERE YOU LEFT");
      expect(result.current.cardData?.buttonIcon).toBe("arrow_right_alt");
    });

    it("resolves the book name and chapter from the last reading", () => {
      const result = setup({ lastReading: { bookId: "GEN", chapter: 7 } });
      expect(result.current.cardData?.book).toBe("Genesis");
      expect(result.current.cardData?.chapter).toBe(7);
    });

    it("falls back to the bookId when the name is unknown", () => {
      const result = setup({
        lastReading: { bookId: "XYZ", chapter: 1 },
        bookNames: new Map(),
      });
      expect(result.current.cardData?.book).toBe("XYZ");
    });
  });

  it("opens the last reading, letting the default translation apply", () => {
    const result = setup({ lastReading: { bookId: "JHN", chapter: 3 } });
    act(() => result.current.handleButtonClick());
    expect(openPassage).toHaveBeenCalledWith({ bookId: "JHN", chapter: 3 });
  });
});
