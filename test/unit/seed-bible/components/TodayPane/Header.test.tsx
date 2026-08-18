import { render } from "preact";
import { act } from "preact/test-utils";
import { Header } from "@packages/seed-bible/seed-bible/components/TodayPane/Header";
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
      render(<Header login={loginWithName(options.username)} />, container)
    );
  }

  function setupAtHour(hour: number) {
    vi.setSystemTime(new Date(2026, 5, 15, hour, 0, 0));
    setup();
  }

  const header = () =>
    container.querySelector<HTMLDivElement>(".today-header")!;
  const date = () => header().querySelector(":scope > span")!.textContent;
  const heading = () => header().querySelector("h1")!.textContent;

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
  });

  describe("greeting", () => {
    it("is morning between 05:00 and 11:59", () => {
      setupAtHour(8);
      expect(heading()).toContain("Good morning,");
    });

    it("is afternoon between 12:00 and 17:59", () => {
      setupAtHour(14);
      expect(heading()).toContain("Good afternoon,");
    });

    it("is evening between 18:00 and 20:59", () => {
      setupAtHour(19);
      expect(heading()).toContain("Good evening,");
    });

    it("is night late at night", () => {
      setupAtHour(23);
      expect(heading()).toContain("Good night,");
    });

    it("is night in the small hours", () => {
      setupAtHour(3);
      expect(heading()).toContain("Good night,");
    });
  });

  describe("name", () => {
    it("uses the username when present", () => {
      setup({ username: "Alice" });
      expect(heading()).toContain("Alice!");
    });

    it("falls back to 'Guest' for an empty username", () => {
      setup({ username: "" });
      expect(heading()).toContain("Guest!");
    });

    it("falls back to 'Guest' when the username is undefined", () => {
      setup({ username: undefined });
      expect(heading()).toContain("Guest!");
    });
  });
});
