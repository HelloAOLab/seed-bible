import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { useWelcome } from "@packages/seed-bible/seed-bible/components/TodayPane/useWelcome";
import { useTodayContext } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayContext";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

// The hook imports the verse highlighter directly, so it is stubbed at the
// module boundary rather than injected.
const { getHighlightedWelcomeVerse } = vi.hoisted(() => ({
  getHighlightedWelcomeVerse:
    vi.fn<(translationId: string, rawVerseText: string) => string>(),
}));

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/welcomeVerseMap",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getHighlightedWelcomeVerse,
  })
);
vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

type Result = ReturnType<typeof useWelcome>;

describe("useWelcome", () => {
  let container: HTMLDivElement;
  let openBookSelector: Mock;
  let addTab: Mock;
  let closeToday: Mock;
  let getVerseText: Mock;
  let getDefaultTranslation: Mock;
  let lastTranslationId: Signal<string | null>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    openBookSelector = vi.fn();
    addTab = vi.fn();
    closeToday = vi.fn();
    getVerseText = vi.fn(async () => "raw verse");
    getDefaultTranslation = vi.fn(() => "DEF");
    getHighlightedWelcomeVerse.mockImplementation(
      (_translationId: string, raw: string) => `HL:${raw}`
    );
    lastTranslationId = signal<string | null>("KJV");
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(
    options: {
      username?: string | undefined;
      bookNames?: Map<string, string>;
    } = {}
  ) {
    (useTodayContext as Mock).mockReturnValue({
      username: options.username,
      bookNames: signal(options.bookNames ?? new Map([["JHN", "John"]])),
      getVerseText,
      lastTranslationId,
      getDefaultTranslation,
      openBookSelector,
      addTab,
      closeToday,
      theme: { variables: { readerFontColor: "#112233" } },
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useWelcome();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("greeting", () => {
    it("uses a personal greeting when a username is present", () => {
      const result = setup({ username: "Gabriel" });
      expect(result.current.greeting).toBe("Welcome, Gabriel!");
    });

    it("uses an anonymous greeting when there is no username", () => {
      const result = setup({ username: undefined });
      expect(result.current.greeting).toBe("Welcome!");
    });
  });

  describe("book", () => {
    it("formats the John 1:1 reference in uppercase", () => {
      const result = setup({ bookNames: new Map([["JHN", "John"]]) });
      expect(result.current.book.value).toBe("JOHN 1:1");
    });

    it("renders 'undefined' when the John name is missing", () => {
      const result = setup({ bookNames: new Map() });
      expect(result.current.book.value).toBe("undefined 1:1");
    });
  });

  describe("static content", () => {
    it("translates the selector and button texts", () => {
      const result = setup();
      expect(result.current.selectorText).toBe("Open Bible");
      expect(result.current.startButtonText).toBe("Read the first chapter");
      expect(result.current.startButtonIcon).toBe("arrow_right_alt");
    });

    it("forwards openBookSelector", () => {
      const result = setup();
      expect(result.current.openBookSelector).toBe(openBookSelector);
    });

    it("builds the seed-bible icon style from the theme", () => {
      const result = setup();
      expect(result.current.seedBibleIconStyle).toEqual({
        width: "1.25rem",
        height: "1.25rem",
        backgroundColor: "#112233",
      });
    });
  });

  describe("welcome verse fetch", () => {
    it("fetches the verse using the last translation id", async () => {
      lastTranslationId.value = "KJV";
      getVerseText.mockResolvedValue("In the beginning");
      const result = setup();
      await act(async () => {});

      expect(getVerseText).toHaveBeenCalledWith("KJV", "JHN", 1, 1);
      expect(getHighlightedWelcomeVerse).toHaveBeenCalledWith(
        "KJV",
        "In the beginning"
      );
      expect(result.current.welcomeVerse.value).toBe('"HL:In the beginning"');
    });

    it("falls back to the default translation when there is no last one", async () => {
      lastTranslationId.value = null;
      getDefaultTranslation.mockReturnValue("DEF");
      const result = setup();
      await act(async () => {});

      expect(getVerseText).toHaveBeenCalledWith("DEF", "JHN", 1, 1);
      expect(result.current.welcomeVerse.value).toBe('"HL:raw verse"');
    });

    it("falls back to an empty translation id when none is available", async () => {
      lastTranslationId.value = null;
      getDefaultTranslation.mockReturnValue(undefined);
      setup();
      await act(async () => {});

      expect(getVerseText).toHaveBeenCalledWith("", "JHN", 1, 1);
    });

    it("treats a missing verse text as an empty string", async () => {
      getVerseText.mockResolvedValue(null);
      setup();
      await act(async () => {});

      expect(getHighlightedWelcomeVerse).toHaveBeenCalledWith("KJV", "");
    });

    it("ignores a stale fetch result after the translation changes", async () => {
      const d1 = deferred<string>();
      const d2 = deferred<string>();
      getVerseText
        .mockReturnValueOnce(d1.promise) // first effect run (translation "KJV")
        .mockReturnValueOnce(d2.promise); // re-run after the change

      const result = setup();
      // Change the translation before the first fetch resolves → cancels it.
      act(() => {
        lastTranslationId.value = "NIV";
      });

      await act(async () => {
        d1.resolve("stale text");
        d2.resolve("fresh text");
      });

      expect(result.current.welcomeVerse.value).toBe('"HL:fresh text"');
    });
  });

  describe("handleStartButtonClick", () => {
    it("opens Genesis 1 with the last translation id", () => {
      lastTranslationId.value = "KJV";
      const result = setup();
      act(() => result.current.handleStartButtonClick());
      expect(addTab).toHaveBeenCalledWith("GEN", 1, "KJV");
    });

    it("closes the Today screen", () => {
      const result = setup();
      act(() => result.current.handleStartButtonClick());
      expect(closeToday).toHaveBeenCalledTimes(1);
    });

    it("falls back through the default translation then empty string", () => {
      lastTranslationId.value = null;
      getDefaultTranslation.mockReturnValue(undefined);
      const result = setup();
      act(() => result.current.handleStartButtonClick());
      expect(addTab).toHaveBeenCalledWith("GEN", 1, "");
    });
  });
});
