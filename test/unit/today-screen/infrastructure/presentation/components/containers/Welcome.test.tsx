import { render } from "preact";
import { act } from "preact/test-utils";
import { Welcome } from "todayScreen.infrastructure.presentation.components.containers.Welcome";
import { useWelcome } from "todayScreen.infrastructure.presentation.hooks.useWelcome";
import { SeedBibleIcon } from "todayScreen.infrastructure.presentation.components.ui.SeedBibleIcon";

jest.mock("todayScreen.infrastructure.presentation.hooks.useWelcome", () => ({
  useWelcome: jest.fn(),
}));

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.SpinnerIcon",
  () => ({
    SpinnerIcon: jest.fn(() => <div data-testid="spinner" />),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.SeedBibleIcon",
  () => ({
    SeedBibleIcon: jest.fn(() => <div data-testid="seed-bible-icon" />),
  })
);

type Result = ReturnType<typeof useWelcome>;

// The hook exposes several values as signals/strings rendered directly as JSX
// children; for the mock, plain values render the same and keep the test simple.
interface Options {
  greeting?: string;
  book?: string;
  welcomeVerse?: string;
  selectorText?: string;
  startButtonText?: string;
  startButtonIcon?: string;
  footerTitle?: string;
  footerContent?: string;
  seedBibleIconStyle?: Record<string, string>;
  openBookSelector?: () => void;
  handleStartButtonClick?: () => void;
}

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

function makeResult(options: Options = {}): Result {
  return {
    greeting: options.greeting ?? "Welcome, Alice!",
    book: options.book ?? "John",
    welcomeVerse: {
      value: options.welcomeVerse ?? "<hl>In the beginning</hl> was the Word",
    },
    openBookSelector: options.openBookSelector ?? jest.fn(),
    selectorText: options.selectorText ?? "Open Bible",
    MaterialIcon,
    startButtonText: options.startButtonText ?? "Read the first chapter",
    startButtonIcon: options.startButtonIcon ?? "arrow_forward",
    handleStartButtonClick: options.handleStartButtonClick ?? jest.fn(),
    footerTitle: options.footerTitle ?? "Everything begins small.",
    footerContent: options.footerContent ?? "Take your time.",
    seedBibleIconStyle: options.seedBibleIconStyle ?? { width: "32px" },
  } as unknown as Result;
}

describe("Welcome", () => {
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

  function setup(options: Options = {}) {
    const result = makeResult(options);
    (useWelcome as jest.Mock).mockReturnValue(result);
    act(() => render(<Welcome />, container));
    return result;
  }

  const q = (sel: string) => container.querySelector(sel);
  const btn = (sel: string) => container.querySelector<HTMLButtonElement>(sel);

  describe("content", () => {
    it("renders the greeting", () => {
      setup({ greeting: "Welcome, Bob!" });
      expect(q(".welcome-screen-greeting")!.textContent).toBe("Welcome, Bob!");
    });

    it("renders the book name", () => {
      setup({ book: "Genesis" });
      expect(q(".welcome-screen-book")!.textContent).toBe("Genesis");
    });

    it("renders the welcome verse as HTML", () => {
      setup({ welcomeVerse: "<hl>In the beginning</hl> was the Word" });
      const verse = q(".welcome-screen-verse")!;
      expect(verse.querySelector("hl")).not.toBeNull();
      expect(verse.textContent).toBe("In the beginning was the Word");
    });
  });

  describe("book selector", () => {
    it("renders the selector button with the SeedBibleIcon and selector text", () => {
      const seedBibleIconStyle = { width: "48px" };
      setup({ selectorText: "Abrir Biblia", seedBibleIconStyle });
      const button = btn(".book-selector-button")!;
      expect(button.textContent).toBe("Abrir Biblia");
      expect(q("[data-testid='seed-bible-icon']")).not.toBeNull();
      expect((SeedBibleIcon as jest.Mock).mock.calls[0]![0].style).toBe(
        seedBibleIconStyle
      );
    });

    it("calls openBookSelector when the selector button is clicked", () => {
      const result = setup();
      act(() => btn(".book-selector-button")!.click());
      expect(result.openBookSelector).toHaveBeenCalledTimes(1);
    });
  });

  describe("start button", () => {
    it("renders the start button text and icon", () => {
      setup({ startButtonText: "Start", startButtonIcon: "play_arrow" });
      const button = btn(".welcome-screen-start-button")!;
      expect(button.textContent).toContain("Start");
      expect(button.querySelector(".material-icon")!.textContent).toBe(
        "play_arrow"
      );
    });

    it("calls handleStartButtonClick when the start button is clicked", () => {
      const result = setup();
      act(() => btn(".welcome-screen-start-button")!.click());
      expect(result.handleStartButtonClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("footer", () => {
    it("renders the spinner, footer title and footer content", () => {
      setup({
        footerTitle: "Everything begins small.",
        footerContent: "Take your time.",
      });
      expect(q("[data-testid='spinner']")).not.toBeNull();
      expect(q(".welcome-screen-footer-title")!.textContent).toBe(
        "Everything begins small."
      );
      expect(q(".welcome-screen-footer-content")!.textContent).toBe(
        "Take your time."
      );
    });
  });
});
