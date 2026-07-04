import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { TodayContent } from "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/TodayContent";
import { useTodayContent } from "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContent";

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContent",
  () => ({
    useTodayContent: vi.fn(),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/Header",
  () => ({
    Header: vi.fn(() => <div data-testid="header" />),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/ResumeReadingSection",
  () => ({
    ResumeReadingSection: vi.fn(() => <div data-testid="resume" />),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/ui/Divider",
  () => ({
    Divider: vi.fn(() => <div data-testid="divider" />),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/RecommendationsSection",
  () => ({
    RecommendationsSection: vi.fn(() => (
      <div data-testid="section-recommendations" />
    )),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/SearchSection",
  () => ({
    SearchSection: vi.fn(() => <div data-testid="section-search" />),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/SocialSection",
  () => ({
    SocialSection: vi.fn(() => <div data-testid="section-social" />),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/BookmarksSection",
  () => ({
    BookmarksSection: vi.fn(() => <div data-testid="section-bookmarks" />),
  })
);

type DividedSection = "search" | "recommendations" | "social" | "bookmarks";

describe("TodayContent", () => {
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
      dividedSectionsIds?: DividedSection[];
      showResumeReading?: boolean;
    } = {}
  ) {
    (useTodayContent as Mock).mockReturnValue({
      dividedSectionsIds: options.dividedSectionsIds ?? [],
      showResumeReading: options.showResumeReading ?? false,
    });
    act(() => render(<TodayContent />, container));
  }

  const q = (sel: string) => container.querySelector(sel);
  const count = (sel: string) => container.querySelectorAll(sel).length;

  it("always renders the Header", () => {
    setup();
    expect(q("[data-testid='header']")).not.toBeNull();
  });

  describe("resume reading", () => {
    it("renders the ResumeReadingSection when showResumeReading is true", () => {
      setup({ showResumeReading: true });
      expect(q("[data-testid='resume']")).not.toBeNull();
    });

    it("does not render the ResumeReadingSection when showResumeReading is false", () => {
      setup({ showResumeReading: false });
      expect(q("[data-testid='resume']")).toBeNull();
    });
  });

  describe("divided sections", () => {
    it("renders the component mapped to each section id", () => {
      setup({
        dividedSectionsIds: [
          "search",
          "recommendations",
          "social",
          "bookmarks",
        ],
      });
      expect(q("[data-testid='section-search']")).not.toBeNull();
      expect(q("[data-testid='section-recommendations']")).not.toBeNull();
      expect(q("[data-testid='section-social']")).not.toBeNull();
      expect(q("[data-testid='section-bookmarks']")).not.toBeNull();
    });

    it("renders a divider between sections but not after the last", () => {
      setup({ dividedSectionsIds: ["search", "social", "bookmarks"] });
      expect(count("[data-testid='divider']")).toBe(2); // 3 sections → 2 dividers
    });

    it("renders no divider for a single section", () => {
      setup({ dividedSectionsIds: ["search"] });
      expect(count("[data-testid='section-search']")).toBe(1);
      expect(count("[data-testid='divider']")).toBe(0);
    });

    it("renders no sections or dividers when the list is empty", () => {
      setup({ dividedSectionsIds: [] });
      expect(count("[data-testid='divider']")).toBe(0);
      expect(count("[data-testid^='section-']")).toBe(0);
    });

    it("preserves the order of the section ids", () => {
      setup({ dividedSectionsIds: ["bookmarks", "search"] });
      const sections = Array.from(
        container.querySelectorAll("[data-testid^='section-']")
      ).map((el) => el.getAttribute("data-testid"));
      expect(sections).toEqual(["section-bookmarks", "section-search"]);
    });
  });
});
