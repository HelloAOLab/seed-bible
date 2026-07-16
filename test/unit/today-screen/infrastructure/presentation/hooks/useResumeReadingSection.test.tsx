import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useResumeReadingSection } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useResumeReadingSection";
import { useTodayContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

const addTab = vi.fn();
const closeToday = vi.fn();
const getDefaultTranslation = vi.fn(() => "AAB");

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
    lastReading?: { bookId: string; chapter: number };
    bookNames?: Map<string, string>;
  }) {
    (useTodayContext as Mock).mockReturnValue({
      MaterialIcon,
      userLastReading: signal(options.lastReading),
      translate: vi.fn((key: string) => key),
      bookNames: signal(options.bookNames ?? new Map([["GEN", "Genesis"]])),
      addTab,
      closeToday,
      getDefaultTranslation,
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useResumeReadingSection();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("throws when there is no last reading", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => setup({ lastReading: undefined })).toThrow(
      "useResumeReadingSection: userLastReading.value is undefined"
    );
    consoleError.mockRestore();
  });

  describe("cardData", () => {
    it("translates the resume title and uses a fixed button icon", () => {
      const result = setup({ lastReading: { bookId: "GEN", chapter: 3 } });
      expect(result.current.cardData.title).toBe("resume-reading");
      expect(result.current.cardData.buttonIcon).toBe("arrow_right_alt");
    });

    it("resolves the book name and chapter from the last reading", () => {
      const result = setup({ lastReading: { bookId: "GEN", chapter: 7 } });
      expect(result.current.cardData.book).toBe("Genesis");
      expect(result.current.cardData.chapter).toBe(7);
    });

    it("falls back to the bookId when the name is unknown", () => {
      const result = setup({
        lastReading: { bookId: "XYZ", chapter: 1 },
        bookNames: new Map(),
      });
      expect(result.current.cardData.book).toBe("XYZ");
    });
  });

  it("exposes the MaterialIcon", () => {
    const result = setup({ lastReading: { bookId: "GEN", chapter: 1 } });
    expect(result.current.MaterialIcon).toBe(MaterialIcon);
  });

  it("opens the last reading in a tab on button click", () => {
    const result = setup({ lastReading: { bookId: "JHN", chapter: 3 } });
    act(() => result.current.handleButtonClick());
    expect(getDefaultTranslation).toHaveBeenCalled();
    expect(addTab).toHaveBeenCalledWith("JHN", 3, "AAB");
  });

  it("closes the Today screen on button click", () => {
    const result = setup({ lastReading: { bookId: "JHN", chapter: 3 } });
    act(() => result.current.handleButtonClick());
    expect(closeToday).toHaveBeenCalledTimes(1);
  });
});
