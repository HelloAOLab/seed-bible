import { render } from "preact";
import { act } from "preact/test-utils";
import { Header } from "todayScreen.infrastructure.presentation.components.containers.Header";
import { useHeader } from "todayScreen.infrastructure.presentation.hooks.useHeader";

jest.mock("todayScreen.infrastructure.presentation.hooks.useHeader", () => ({
  useHeader: jest.fn(),
}));

type HeaderResult = ReturnType<typeof useHeader>;

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

function makeHeaderResult(overrides: Partial<HeaderResult> = {}): HeaderResult {
  return {
    date: "Thursday, Jun 11",
    greeting: "Good morning",
    name: "Alice",
    MaterialIcon,
    notificationIcon: "notifications",
    settingsIcon: "settings",
    handleNotificationClick: jest.fn(),
    handleSettingsClick: jest.fn(),
    ...overrides,
  } as unknown as HeaderResult;
}

describe("Header", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(overrides: Partial<HeaderResult> = {}) {
    const result = makeHeaderResult(overrides);
    (useHeader as jest.Mock).mockReturnValue(result);
    act(() => render(<Header />, container));
    return result;
  }

  function header() {
    return container.querySelector<HTMLDivElement>(".today-header");
  }

  function buttons() {
    return header()!.querySelectorAll<HTMLButtonElement>("button");
  }

  describe("content", () => {
    it("renders the date in the header's direct span", () => {
      setup({ date: "Friday, Jun 12" });
      expect(header()!.querySelector(":scope > span")!.textContent).toBe(
        "Friday, Jun 12"
      );
    });

    it("renders the greeting and name in the heading", () => {
      setup({ greeting: "Good evening", name: "Bob" });
      expect(header()!.querySelector("h1")!.textContent).toBe(
        "Good evening, Bob!"
      );
    });

    it("renders the notification icon in the first button", () => {
      setup({ notificationIcon: "bell" });
      expect(buttons()[0]!.querySelector(".material-icon")!.textContent).toBe(
        "bell"
      );
    });

    it("renders the settings icon in the second button", () => {
      setup({ settingsIcon: "gear" });
      expect(buttons()[1]!.querySelector(".material-icon")!.textContent).toBe(
        "gear"
      );
    });

    it("renders exactly two action buttons", () => {
      setup();
      expect(buttons()).toHaveLength(2);
    });
  });

  describe("interaction", () => {
    it("calls handleNotificationClick when the first button is clicked", () => {
      const result = setup();
      act(() => buttons()[0]!.click());
      expect(result.handleNotificationClick).toHaveBeenCalledTimes(1);
      expect(result.handleSettingsClick).not.toHaveBeenCalled();
    });

    it("calls handleSettingsClick when the second button is clicked", () => {
      const result = setup();
      act(() => buttons()[1]!.click());
      expect(result.handleSettingsClick).toHaveBeenCalledTimes(1);
      expect(result.handleNotificationClick).not.toHaveBeenCalled();
    });
  });
});
