import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useSearchSection } from "@packages/seed-bible/seed-bible/components/TodayPane/useSearchSection";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

const openBookSelector = vi.fn();

type Result = ReturnType<typeof useSearchSection>;

describe("useSearchSection", () => {
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

  function setup(secondaryFontColor = "#abcdef", isMobile = false) {
    const theme = signal({
      variables: { secondaryFontColor },
    } as unknown as BibleTheme);
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useSearchSection({
        theme,
        isMobile: signal(isMobile),
        onOpenBookSelector: openBookSelector,
      });
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("translates the title and selector text", () => {
    const result = setup();
    expect(result.current.title).toBe("GO SOMEWHERE NEW");
    expect(result.current.selectorText).toBe("Books");
  });

  it("builds the seed-bible icon style from the theme", () => {
    const result = setup("rgb(10, 20, 30)");
    expect(result.current.seedBibleIconStyle).toEqual({
      width: "1.5rem",
      height: "1.5rem",
      backgroundColor: "rgb(10, 20, 30)",
    });
  });

  it("uses a smaller seed-bible icon on mobile", () => {
    const result = setup("#abcdef", true);
    expect(result.current.seedBibleIconStyle).toMatchObject({
      width: "1.25rem",
      height: "1.25rem",
    });
  });
});
