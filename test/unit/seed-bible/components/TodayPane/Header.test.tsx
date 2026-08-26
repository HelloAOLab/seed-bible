import { render } from "preact";
import { act } from "preact/test-utils";
import { Header } from "@packages/seed-bible/seed-bible/components/TodayPane/Header";
import {
  TICK_INTERVAL_MS,
  TimeProvider,
} from "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext";
import { loginWithName } from "../../testUtils/todayStubs";
import { mockI18nState } from "../../testUtils/mockI18n";

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
    // Fixed so the whole heading can be asserted, comma and all.
    beforeEach(() => {
      vi.setSystemTime(new Date(2026, 5, 15, 8, 0, 0));
    });

    it("greets a signed-in reader by name", () => {
      setup({ username: "Alice" });
      expect(heading()).toBe("Good morning, Alice!");
      expect(nameElement()?.textContent).toBe("Alice!");
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
  });
});
