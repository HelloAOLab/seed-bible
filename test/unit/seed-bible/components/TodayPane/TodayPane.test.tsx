import type { Mock } from "vitest";
import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { TodayPane } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayPane";
import type { ReadingHistoryState } from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";
import type { Bookmark } from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import { todayScreenPropsStub, todayStub } from "../../testUtils/todayStubs";
import { Welcome } from "@packages/seed-bible/seed-bible/components/TodayPane/Welcome";
import { Header } from "@packages/seed-bible/seed-bible/components/TodayPane/Header";
import { ResumeReadingSection } from "@packages/seed-bible/seed-bible/components/TodayPane/ResumeReadingSection";
import { BookmarksSection } from "@packages/seed-bible/seed-bible/components/TodayPane/BookmarksSection";
import { SearchSection } from "@packages/seed-bible/seed-bible/components/TodayPane/SearchSection";
import { SocialSection } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSection";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext",
  () => ({
    TimeProvider: vi.fn(({ children }: { children: ComponentChildren }) => (
      <div data-testid="time-provider">{children}</div>
    )),
  })
);

// Every section reads managers or context of its own, so they stand in for the
// real thing here — these tests are about which sections the layout renders,
// in what order, and what each one is handed.
vi.mock("@packages/seed-bible/seed-bible/components/TodayPane/Welcome", () => ({
  Welcome: vi.fn(() => <div data-testid="welcome" />),
}));

vi.mock("@packages/seed-bible/seed-bible/components/TodayPane/Header", () => ({
  Header: vi.fn(() => <div data-testid="header" />),
}));

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/ResumeReadingSection",
  () => ({
    ResumeReadingSection: vi.fn(() => <div data-testid="section-resume" />),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/BookmarksSection",
  () => ({
    BookmarksSection: vi.fn(() => <div data-testid="section-bookmarks" />),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/SearchSection",
  () => ({
    SearchSection: vi.fn(() => <div data-testid="section-search" />),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/SocialSection",
  () => ({
    SocialSection: vi.fn(() => <div data-testid="section-social" />),
  })
);

describe("TodayPane", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(
    options: {
      status?: ReadingHistoryState["status"];
      bookmarks?: Bookmark[];
    } = {}
  ) {
    const status = options.status ?? "ready";
    const readingHistory =
      status === "ready"
        ? signal<ReadingHistoryState>({
            status: "ready",
            lastReading: { bookId: "JHN", chapter: 3 },
          })
        : signal<ReadingHistoryState>({ status });
    const props = todayScreenPropsStub({
      today: todayStub({ readingHistory }),
      bookmarks: signal(options.bookmarks ?? []),
    });
    act(() => render(<TodayPane {...props} />, container));
    return props;
  }

  const q = (sel: string) => container.querySelector(sel);
  const count = (sel: string) => container.querySelectorAll(sel).length;
  const todayContainer = () =>
    container.querySelector<HTMLDivElement>(".sb-today-container");

  it("nests the screen inside the time provider", () => {
    setup();
    const timeProvider = q("[data-testid='time-provider']")!;
    expect(timeProvider.querySelector(".sb-today-container")).not.toBeNull();
  });

  it("renders the sb-today-container element", () => {
    setup();
    expect(todayContainer()).not.toBeNull();
  });

  describe("Welcome vs the personalized layout", () => {
    it("renders Welcome, safe-centered, when history is empty", () => {
      setup({ status: "empty" });
      expect(q("[data-testid='welcome']")).not.toBeNull();
      expect(q(".sb-today-content")).toBeNull();
      expect(todayContainer()!.style.alignItems).toBe("safe center");
    });

    it("renders the personalized layout, top-aligned, while history loads", () => {
      setup({ status: "loading" });
      expect(q(".sb-today-content")).not.toBeNull();
      expect(q("[data-testid='welcome']")).toBeNull();
      expect(todayContainer()!.style.alignItems).toBe("flex-start");
    });

    it("renders the personalized layout, top-aligned, when history is ready", () => {
      setup({ status: "ready" });
      expect(q(".sb-today-content")).not.toBeNull();
      expect(q("[data-testid='welcome']")).toBeNull();
      expect(todayContainer()!.style.alignItems).toBe("flex-start");
    });
  });

  describe("the personalized layout", () => {
    it("renders the header", () => {
      setup();
      expect(q("[data-testid='header']")).not.toBeNull();
    });

    // Unconditional by construction: the only status that would hide it renders
    // Welcome instead, and `loading` shows the card's own placeholder.
    it("renders the resume section while history loads and once it is ready", () => {
      setup({ status: "loading" });
      expect(q("[data-testid='section-resume']")).not.toBeNull();

      act(() => render(null, container));
      setup({ status: "ready" });
      expect(q("[data-testid='section-resume']")).not.toBeNull();
    });

    it("renders the bookmarks section when there is at least one bookmark", () => {
      setup({ bookmarks: [{ id: "b1" } as Bookmark] });
      expect(q("[data-testid='section-bookmarks']")).not.toBeNull();
    });

    it("omits the bookmarks section when there are none", () => {
      setup({ bookmarks: [] });
      expect(q("[data-testid='section-bookmarks']")).toBeNull();
    });

    it("renders search and social with exactly one sb-today-divider between them", () => {
      setup();
      const order = Array.from(
        container.querySelectorAll(
          "[data-testid^='section-'], .sb-today-content > .sb-today-divider"
        )
      ).map((el) => el.getAttribute("data-testid") ?? "sb-today-divider");

      expect(order).toEqual([
        "section-resume",
        "section-search",
        "sb-today-divider",
        "section-social",
      ]);
      expect(count(".sb-today-divider")).toBe(1);
    });
  });

  // A dropped prop here would silently blank a whole section, and each section
  // takes a different subset — so the wiring is asserted per section.
  describe("prop wiring", () => {
    const propsOf = (component: unknown) =>
      (component as Mock).mock.calls[0]![0] as Record<string, unknown>;

    it("hands Welcome its managers and both handlers", () => {
      const props = setup({ status: "empty" });
      expect(propsOf(Welcome)).toMatchObject({
        today: props.today,
        login: props.login,
        theme: props.theme,
        onOpenBookSelector: props.onOpenBookSelector,
        onOpenPassage: props.onOpenPassage,
      });
    });

    it("hands each personalized section the props it needs", () => {
      const props = setup({ bookmarks: [{ id: "b1" } as Bookmark] });

      expect(propsOf(Header)).toMatchObject({ login: props.login });
      expect(propsOf(ResumeReadingSection)).toMatchObject({
        today: props.today,
        onOpenPassage: props.onOpenPassage,
      });
      expect(propsOf(BookmarksSection)).toMatchObject({
        today: props.today,
        bookmarks: props.bookmarks,
        isMobile: props.isMobile,
        onOpenPassage: props.onOpenPassage,
        onShowBookmarksList: props.onShowBookmarksList,
      });
      expect(propsOf(SearchSection)).toMatchObject({
        today: props.today,
        theme: props.theme,
        isMobile: props.isMobile,
        onOpenBookSelector: props.onOpenBookSelector,
        onOpenPassage: props.onOpenPassage,
      });
      expect(propsOf(SocialSection)).toMatchObject({
        today: props.today,
        login: props.login,
        theme: props.theme,
        onOpenPassage: props.onOpenPassage,
      });
    });
  });
});
