import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useHeader } from "@packages/seed-bible/seed-bible/components/TodayPane/useHeader";
import { mockI18nState } from "../../testUtils/mockI18n";
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

type Result = ReturnType<typeof useHeader>;

describe("useHeader", () => {
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
    (useTodayContext as Mock).mockReturnValue({
      username: options.username,
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useHeader();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  function setupAtHour(hour: number) {
    vi.setSystemTime(new Date(2026, 5, 15, hour, 0, 0));
    return setup();
  }

  describe("date", () => {
    it("formats the date as 'day MONTH'", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 8, 0, 0));
      const result = setup({ language: "en" });
      const expectedMonth = new Date(2026, 5, 15)
        .toLocaleString("en", { month: "short" })
        .toUpperCase();
      expect(result.current.date).toBe(`15 ${expectedMonth}`);
    });
  });

  describe("greeting", () => {
    it("is morning between 05:00 and 11:59", () => {
      expect(setupAtHour(8).current.greeting).toBe("Good morning");
    });

    it("is afternoon between 12:00 and 17:59", () => {
      expect(setupAtHour(14).current.greeting).toBe("Good afternoon");
    });

    it("is evening between 18:00 and 20:59", () => {
      expect(setupAtHour(19).current.greeting).toBe("Good evening");
    });

    it("is night otherwise", () => {
      expect(setupAtHour(23).current.greeting).toBe("Good night");
      expect(setupAtHour(3).current.greeting).toBe("Good night");
    });
  });

  describe("name", () => {
    it("uses the username when present", () => {
      expect(setup({ username: "Alice" }).current.name).toBe("Alice");
    });

    it("falls back to 'Guest' for an empty username", () => {
      expect(setup({ username: "" }).current.name).toBe("Guest");
    });

    it("falls back to 'Guest' when the username is undefined", () => {
      expect(setup({ username: undefined }).current.name).toBe("Guest");
    });
  });

  describe("static data", () => {
    it("exposes the notification and settings icons", () => {
      const result = setup();
      expect(result.current.notificationIcon).toBe("notifications");
      expect(result.current.settingsIcon).toBe("settings");
    });
  });

  describe("handlers", () => {
    it("logs on notification click", () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = setup();
      act(() => result.current.handleNotificationClick());
      expect(consoleLog).toHaveBeenCalled();
    });

    it("logs on settings click", () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = setup();
      act(() => result.current.handleSettingsClick());
      expect(consoleLog).toHaveBeenCalled();
    });
  });
});
