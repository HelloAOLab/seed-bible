import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { TodayPane } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayPane";
import type { ReadingHistoryState } from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";
import type { Bookmark } from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { UserProfile } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { todayStub, loginStub } from "../../testUtils/todayStubs";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * Every input to the Today screen arrives as a signal, and a signal read from
 * the wrong place — inside a `useMemo`, or via a dependency array holding the
 * signal object rather than its value — compiles, type-checks, passes lint and
 * renders correctly on first paint. It only misbehaves *later*, when the value
 * changes and the screen does not follow.
 *
 * That is exactly the bug that shipped in the config-bag removal: the timeline
 * kept the old theme's colours for seconds after a switch.
 *
 * These tests render the real component tree — no internal hooks or components
 * stubbed — flip one input at a time, and assert the rendered output follows.
 * They deliberately assert on markup rather than on hook return values, so they
 * keep their meaning when the files behind them are merged or renamed.
 */
describe("Today screen reactivity", () => {
  let container: HTMLDivElement;
  let originalResizeObserver: unknown;

  // One signal per input the screen takes.
  let readingHistory: Signal<ReadingHistoryState>;
  let bookNames: Signal<Map<string, string>>;
  let profile: Signal<UserProfile | null>;
  let bookmarks: Signal<Bookmark[]>;
  let theme: Signal<BibleTheme>;
  let isMobile: Signal<boolean>;

  const themeWith = (variables: Record<string, string>) =>
    ({ variables }) as unknown as BibleTheme;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    originalResizeObserver = (
      globalThis as unknown as { ResizeObserver: unknown }
    ).ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      MockResizeObserver;

    readingHistory = signal<ReadingHistoryState>({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 3 },
    } as ReadingHistoryState);
    bookNames = signal(new Map([["GEN", "Genesis"]]));
    profile = signal({ name: "Alice" } as UserProfile);
    bookmarks = signal<Bookmark[]>([]);
    theme = signal(themeWith({ secondaryFontColor: "rgb(1, 2, 3)" }));
    isMobile = signal(false);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      originalResizeObserver;
    vi.clearAllMocks();
  });

  function setup() {
    const today = todayStub({
      readingHistory,
      bookNames,
      lastTranslationId: signal<string | undefined>("KJV"),
      translationBooksMap: signal(new Map()),
      getDefaultTranslation: () => "KJV",
      getVerseText: async () => "In the beginning",
      getTranslationBooks: async () => ({ books: [] }) as never,
      searchVerses: async () => [],
      getCommunityReading: async () => ({}),
      getReadingHistoryEvents: async () => [],
    });
    const login = loginStub({ userId: signal("u1"), profile });

    act(() =>
      render(
        <TodayPane
          today={today}
          login={login}
          bookmarks={bookmarks}
          theme={theme}
          isMobile={isMobile}
          onOpenPassage={vi.fn()}
          onOpenBookSelector={vi.fn()}
          onShowBookmarksList={vi.fn()}
        />,
        container
      )
    );
  }

  const q = (sel: string) => container.querySelector(sel);
  const text = (sel: string) => q(sel)?.textContent ?? null;

  it("swaps Welcome for the personalized layout when history arrives", () => {
    readingHistory.value = { status: "empty" };
    setup();
    expect(q(".sb-today-welcome-screen")).not.toBeNull();
    expect(q(".sb-today-content")).toBeNull();

    act(() => {
      readingHistory.value = {
        status: "ready",
        lastReading: { bookId: "GEN", chapter: 3 },
      } as ReadingHistoryState;
    });

    expect(q(".sb-today-content")).not.toBeNull();
    expect(q(".sb-today-welcome-screen")).toBeNull();
  });

  it("updates the greeting when the signed-in profile changes", () => {
    setup();
    expect(text(".sb-today-header h1")).toContain("Alice");

    act(() => {
      profile.value = { name: "Bob" } as UserProfile;
    });

    expect(text(".sb-today-header h1")).toContain("Bob");
    expect(text(".sb-today-header h1")).not.toContain("Alice");
  });

  it("renames the resume card when the translation's book names change", () => {
    setup();
    expect(text(".sb-today-resume-card h1")).toContain("Genesis");

    act(() => {
      bookNames.value = new Map([["GEN", "Génesis"]]);
    });

    expect(text(".sb-today-resume-card h1")).toContain("Génesis");
  });

  it("reveals the bookmarks strip once a bookmark exists", () => {
    setup();
    expect(q(".sb-today-bookmarks-section")).toBeNull();

    act(() => {
      bookmarks.value = [
        {
          id: "b1",
          translationId: "KJV",
          bookId: "GEN",
          chapterNumber: 3,
          createdAt: 0,
          category: "Favorites",
        } as Bookmark,
      ];
    });

    expect(q(".sb-today-bookmarks-section")).not.toBeNull();
  });

  // The regression that prompted this suite: a theme switch has to repaint
  // immediately, without waiting for an unrelated re-render to carry it.
  it("restyles on a theme switch", () => {
    setup();
    const icon = () => q(".sb-today-seed-bible-icon") as SVGSVGElement;
    expect(icon().style.fill).toBe("rgb(1, 2, 3)");

    act(() => {
      theme.value = themeWith({ secondaryFontColor: "rgb(9, 9, 9)" });
    });

    expect(icon().style.fill).toBe("rgb(9, 9, 9)");
  });

  it("resizes chrome when the viewport crosses the mobile breakpoint", () => {
    setup();
    const icon = () => q(".sb-today-seed-bible-icon") as SVGSVGElement;
    expect(icon().style.width).toBe("1.5rem");

    act(() => {
      isMobile.value = true;
    });

    expect(icon().style.width).toBe("1.25rem");
  });
});
