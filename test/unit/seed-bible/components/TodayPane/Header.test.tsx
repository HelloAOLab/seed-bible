import { render } from "preact";
import { act } from "preact/test-utils";
import { Header } from "@packages/seed-bible/seed-bible/components/TodayPane/Header";
import {
  TICK_INTERVAL_MS,
  TimeProvider,
} from "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext";
import { loginWithName } from "../../testUtils/todayStubs";
import {
  mockI18nState,
  mockI18nTranslations,
  resetMockI18n,
} from "../../testUtils/mockI18n";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

describe("Header", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.useFakeTimers();
    // Per-key translation overrides are module-level, so without this a test
    // that sets one leaks it into every test that follows.
    resetMockI18n();
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup(
    options: { language?: string; username?: string | undefined } = {}
  ) {
    mockI18nState.language = options.language ?? "en";
    act(() =>
      render(
        // The real parent: `Header` reads the tick that keeps its clock current.
        <TimeProvider>
          <Header login={loginWithName(options.username)} />
        </TimeProvider>,
        container
      )
    );
  }

  function setupAtHour(hour: number) {
    vi.setSystemTime(new Date(2026, 5, 15, hour, 0, 0));
    setup();
  }

  const header = () =>
    container.querySelector<HTMLDivElement>(".sb-today-header")!;
  const date = () => header().querySelector(":scope > span")!.textContent;
  const heading = () => header().querySelector("h1")!.textContent;
  // The name gets its own element so it can carry the accent colour.
  const nameElement = () => header().querySelector("h1 > span");

  describe("date", () => {
    it("formats the date as 'day MONTH'", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 8, 0, 0));
      setup({ language: "en" });

      // Derived the same way the component does, so the assertion holds in any
      // timezone and under any ICU build.
      const expectedMonth = new Date(2026, 5, 15)
        .toLocaleString("en", { month: "short" })
        .toUpperCase();
      expect(date()).toBe(`15 ${expectedMonth}`);
    });

    it("rolls over at midnight while Today is open", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 23, 59, 50));
      setup({ language: "en" });
      const month = new Date(2026, 5, 15)
        .toLocaleString("en", { month: "short" })
        .toUpperCase();
      expect(date()).toBe(`15 ${month}`);

      vi.setSystemTime(new Date(2026, 5, 16, 0, 0, 5));
      act(() => {
        vi.advanceTimersByTime(TICK_INTERVAL_MS);
      });

      expect(date()).toBe(`16 ${month}`);
    });
  });

  describe("greeting", () => {
    it("is morning between 05:00 and 11:59", () => {
      setupAtHour(8);
      expect(heading()).toContain("Good morning");
    });

    it("is afternoon between 12:00 and 17:59", () => {
      setupAtHour(14);
      expect(heading()).toContain("Good afternoon");
    });

    it("is evening between 18:00 and 20:59", () => {
      setupAtHour(19);
      expect(heading()).toContain("Good evening");
    });

    it("is night late at night", () => {
      setupAtHour(23);
      expect(heading()).toContain("Good night");
    });

    it("is night in the small hours", () => {
      setupAtHour(3);
      expect(heading()).toContain("Good night");
    });

    // The greeting was computed once and never again: the memo took no time
    // input, so it stayed on whatever the clock said when Today was opened.
    it("moves on when the hour crosses a boundary while Today is open", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 11, 59, 0));
      setup();
      expect(heading()).toContain("Good morning");

      vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 1));
      act(() => {
        vi.advanceTimersByTime(TICK_INTERVAL_MS);
      });

      expect(heading()).toContain("Good afternoon");
    });
  });

  describe("name", () => {
    // Fixed so the whole sentence can be asserted, punctuation and all.
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 5, 15, 8, 0, 0));
    });

    it("greets a signed-in reader by name", () => {
      setup({ username: "Alice" });
      expect(heading()).toBe("Good morning, Alice!");
      expect(nameElement()?.textContent).toBe("Alice");
    });

    it("greets an anonymous reader without naming them", () => {
      setup({ username: undefined });
      expect(heading()).toBe("Good morning!");
      expect(nameElement()).toBeNull();
    });

    it("greets a reader with an empty name without naming them", () => {
      setup({ username: "" });
      expect(heading()).toBe("Good morning!");
      expect(nameElement()).toBeNull();
    });

    it("greets a reader with a whitespace-only name without naming them", () => {
      setup({ username: "   " });
      expect(heading()).toBe("Good morning!");
    });

    it("trims a padded name rather than greeting the padding", () => {
      setup({ username: "  Alice  " });
      expect(heading()).toBe("Good morning, Alice!");
    });

    // The comma and "!" used to be hardcoded in the JSX, where no translator
    // could reach them. They belong to the string now, so a locale is free to
    // punctuate its own way — and to lead with the name.
    it("takes its punctuation and the name's position from the translation", () => {
      mockI18nTranslations["greeting-morning-named"] = "{{name}}、おはよう！";
      setup({ username: "アリス" });

      expect(heading()).toBe("アリス、おはよう！");
      // Still its own element, even though the sentence now starts with it.
      expect(nameElement()?.textContent).toBe("アリス");
    });

    // A locale that drops the placeholder is making a choice, not a mistake:
    // some languages would not name the reader in a greeting at all.
    it("omits the name element when a translation drops the placeholder", () => {
      mockI18nTranslations["greeting-morning-named"] = "おはようございます";
      setup({ username: "アリス" });

      expect(heading()).toBe("おはようございます");
      expect(nameElement()).toBeNull();
    });

    // The name is interpolated as a sentinel and split back out, so a name that
    // looks like the sentinel's neighbours must not disturb the split.
    it("handles a name containing punctuation the sentence also uses", () => {
      setup({ username: "Al, ice!" });
      expect(heading()).toBe("Good morning, Al, ice!!");
      expect(nameElement()?.textContent).toBe("Al, ice!");
    });
  });
});
