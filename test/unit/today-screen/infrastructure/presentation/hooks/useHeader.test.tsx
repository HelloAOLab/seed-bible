import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useHeader } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useHeader";
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
    (useTodayContext as Mock).mockReturnValue({
      language: options.language ?? "en",
      username: options.username,
      MaterialIcon,
      translate: vi.fn((key: string) => key),
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
      expect(setupAtHour(8).current.greeting).toBe("greeting-morning");
    });

    it("is afternoon between 12:00 and 17:59", () => {
      expect(setupAtHour(14).current.greeting).toBe("greeting-afternoon");
    });

    it("is evening between 18:00 and 20:59", () => {
      expect(setupAtHour(19).current.greeting).toBe("greeting-evening");
    });

    it("is night otherwise", () => {
      expect(setupAtHour(23).current.greeting).toBe("greeting-night");
      expect(setupAtHour(3).current.greeting).toBe("greeting-night");
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
    it("exposes the notification and settings icons and the MaterialIcon", () => {
      const result = setup();
      expect(result.current.notificationIcon).toBe("notifications");
      expect(result.current.settingsIcon).toBe("settings");
      expect(result.current.MaterialIcon).toBe(MaterialIcon);
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
