import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { Welcome } from "@packages/seed-bible/seed-bible/components/TodayPane/Welcome";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { todayStub, loginWithName } from "../../testUtils/todayStubs";

// The pre-highlighted John 1:1 for `AAB`, straight out of the table Welcome
// owns. Asserted verbatim so a silent edit to the data shows up here.
const AAB_JOHN_1_1 =
  "In the <hl>beginning</hl> was the Word, and the Word was with God, and the <hl>Word was God.</hl>";

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

describe("Welcome", () => {
  let container: HTMLDivElement;
  let onOpenBookSelector: Mock;
  let onOpenPassage: Mock;
  let getVerseText: Mock;
  let getDefaultTranslation: Mock;
  let lastTranslationId: Signal<string | undefined>;
  let theme: Signal<BibleTheme>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenBookSelector = vi.fn();
    onOpenPassage = vi.fn();
    getVerseText = vi.fn(async () => "raw verse");
    getDefaultTranslation = vi.fn(() => "DEF");
    lastTranslationId = signal<string | undefined>("KJV");
    theme = signal({
      variables: { readerFontColor: "#112233" },
    } as unknown as BibleTheme);
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
    const today = todayStub({
      bookNames: signal(options.bookNames ?? new Map([["JHN", "John"]])),
      getVerseText,
      lastTranslationId,
      getDefaultTranslation,
    });
    act(() =>
      render(
        <Welcome
          today={today}
          login={loginWithName(options.username)}
          theme={theme}
          onOpenBookSelector={onOpenBookSelector}
          onOpenPassage={onOpenPassage}
        />,
        container
      )
    );
  }

  const q = <T extends Element = Element>(sel: string) =>
    container.querySelector<T>(sel);
  const btn = (sel: string) => container.querySelector<HTMLButtonElement>(sel)!;

  describe("greeting", () => {
    it("uses a personal greeting when a username is present", () => {
      setup({ username: "Gabriel" });
      expect(q(".welcome-screen-greeting")!.textContent).toBe(
        "Welcome, Gabriel!"
      );
    });

    it("uses an anonymous greeting when there is no username", () => {
      setup({ username: undefined });
      expect(q(".welcome-screen-greeting")!.textContent).toBe("Welcome!");
    });
  });

  describe("book reference", () => {
    it("formats the John 1:1 reference in uppercase", () => {
      setup({ bookNames: new Map([["JHN", "John"]]) });
      expect(q(".welcome-screen-book")!.textContent).toBe("JOHN 1:1");
    });

    it("renders 'undefined' when the John name is missing", () => {
      setup({ bookNames: new Map() });
      expect(q(".welcome-screen-book")!.textContent).toBe("undefined 1:1");
    });
  });

  describe("welcome verse", () => {
    it("prefers the pre-highlighted text for a mapped translation", async () => {
      lastTranslationId.value = "AAB";
      // Deliberately different from the mapped text, so the assertion can only
      // pass if the table won.
      getVerseText.mockResolvedValue("plain api text");
      setup();
      await act(async () => {});

      expect(getVerseText).toHaveBeenCalledWith("AAB", "JHN", 1, 1);
      expect(q(".welcome-screen-verse")!.innerHTML).toBe(`"${AAB_JOHN_1_1}"`);
    });

    it("renders the highlight markers as markup, not text", async () => {
      lastTranslationId.value = "AAB";
      setup();
      await act(async () => {});

      const verse = q(".welcome-screen-verse")!;
      expect(verse.querySelectorAll("hl")).toHaveLength(2);
      expect(verse.textContent).toBe(
        '"In the beginning was the Word, and the Word was with God, and the Word was God."'
      );
    });

    it("falls back to the raw verse text for an unmapped translation", async () => {
      lastTranslationId.value = "not-a-translation";
      getVerseText.mockResolvedValue("In the beginning");
      setup();
      await act(async () => {});

      const verse = q(".welcome-screen-verse")!;
      expect(verse.textContent).toBe('"In the beginning"');
      expect(verse.querySelector("hl")).toBeNull();
    });

    it("falls back to the default translation when there is no last one", async () => {
      lastTranslationId.value = undefined;
      getDefaultTranslation.mockReturnValue("DEF");
      setup();
      await act(async () => {});

      expect(getVerseText).toHaveBeenCalledWith("DEF", "JHN", 1, 1);
      expect(q(".welcome-screen-verse")!.textContent).toBe('"raw verse"');
    });

    it("falls back to an empty translation id when none is available", async () => {
      lastTranslationId.value = undefined;
      getDefaultTranslation.mockReturnValue(undefined);
      setup();
      await act(async () => {});

      expect(getVerseText).toHaveBeenCalledWith("", "JHN", 1, 1);
    });

    it("treats a missing verse text as an empty string", async () => {
      getVerseText.mockResolvedValue(null);
      setup();
      await act(async () => {});

      // "KJV" is unmapped, so nothing masks a null slipping through.
      expect(q(".welcome-screen-verse")!.textContent).toBe('""');
    });

    it("ignores a stale fetch result after the translation changes", async () => {
      const d1 = deferred<string>();
      const d2 = deferred<string>();
      getVerseText
        .mockReturnValueOnce(d1.promise) // first effect run (translation "KJV")
        .mockReturnValueOnce(d2.promise); // re-run after the change

      setup();
      // Change the translation before the first fetch resolves → cancels it.
      act(() => {
        lastTranslationId.value = "NIV";
      });

      // The superseded fetch is resolved *last* on purpose. Resolving both in one
      // flush lets the later write win by ordering alone, which passes even with
      // the cancellation guard removed — the shape this test had before it was
      // mutation-checked.
      await act(async () => {
        d2.resolve("fresh text");
      });
      await act(async () => {
        d1.resolve("stale text");
      });

      expect(q(".welcome-screen-verse")!.textContent).toBe('"fresh text"');
    });
  });

  describe("book selector", () => {
    it("renders the selector text and a themed icon", () => {
      setup();
      expect(btn(".book-selector-button").textContent).toBe("Open Bible");

      const icon = q<HTMLDivElement>(".seed-bible-icon")!;
      expect(icon.style.backgroundColor).toBe("rgb(17, 34, 51)");
      expect(icon.style.width).toBe("1.25rem");
    });

    it("recolours the icon when the theme changes", () => {
      setup();

      act(() => {
        theme.value = {
          variables: { readerFontColor: "#445566" },
        } as unknown as BibleTheme;
      });

      expect(q<HTMLDivElement>(".seed-bible-icon")!.style.backgroundColor).toBe(
        "rgb(68, 85, 102)"
      );
    });

    it("opens the book selector when clicked", () => {
      setup();
      act(() => btn(".book-selector-button").click());
      expect(onOpenBookSelector).toHaveBeenCalledTimes(1);
    });
  });

  describe("start button", () => {
    it("renders the start text and the forward arrow", () => {
      setup();
      const button = btn(".welcome-screen-start-button");
      expect(button.textContent).toContain("Read the first chapter");
      expect(
        button.querySelector(".material-symbols-outlined")!.textContent
      ).toBe("arrow_right_alt");
    });

    it("opens Genesis 1 with the last translation id", () => {
      lastTranslationId.value = "KJV";
      setup();

      act(() => btn(".welcome-screen-start-button").click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "GEN",
        chapter: 1,
        translationId: "KJV",
      });
    });

    // No last translation leaves the id unset rather than resolving a default
    // here — `onOpenPassage` owns that fallback.
    it("leaves the translation unset when there is no last one", () => {
      lastTranslationId.value = undefined;
      setup();

      act(() => btn(".welcome-screen-start-button").click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "GEN",
        chapter: 1,
        translationId: undefined,
      });
    });
  });
});
