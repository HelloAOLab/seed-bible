import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useBook } from "@packages/seed-bible/seed-bible/components/TodayPane/useBook";
import { useSocialSectionContext } from "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext";
import type { BookProps } from "@packages/seed-bible/seed-bible/components/TodayPane/Book";
import { todayStub } from "../../testUtils/todayStubs";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/SocialSectionContext",
  () => ({
    useSocialSectionContext: vi.fn(),
  })
);

interface Profile {
  name: string;
  color: string;
  icon: string;
  pictureUrl?: string | null;
}

function makeProfile(id: string, overrides: Partial<Profile> = {}): Profile {
  return {
    name: `Name-${id}`,
    color: "rgb(1, 2, 3)",
    icon: "person",
    pictureUrl: undefined,
    ...overrides,
  };
}

type UseBookResult = ReturnType<typeof useBook>;

describe("useBook", () => {
  let container: HTMLDivElement;
  const openPassage = vi.fn();

  function configureContexts(options: {
    bookNames?: Map<string, string>;
    booksMap?: Map<string, { numberOfChapters: number }>;
    profiles?: Map<string, Profile>;
  }) {
    const today = todayStub({
      bookNames: signal(options.bookNames ?? new Map([["GEN", "Genesis"]])),
      // Only `numberOfChapters` is read, so the fake book summaries omit the rest.
      translationBooksMap: signal(
        options.booksMap ?? new Map([["GEN", { numberOfChapters: 3 }]])
      ) as never,
    });
    (useSocialSectionContext as Mock).mockReturnValue({
      userProfileMap:
        options.profiles ??
        new Map([
          ["u1", makeProfile("u1")],
          ["u2", makeProfile("u2")],
        ]),
    });
    return today;
  }

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
    props: BookProps,
    options: Parameters<typeof configureContexts>[0] = {}
  ) {
    const today = configureContexts(options);
    const result = { current: null as unknown as UseBookResult };
    function TestComponent() {
      result.current = useBook({ ...props, today, onOpenPassage: openPassage });
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  const props = (overrides: Partial<BookProps> = {}): BookProps => ({
    bookId: "GEN",
    chaptersReading: {},
    usersId: ["u1", "u2"],
    ...overrides,
  });

  describe("name", () => {
    it("resolves the book name from bookNames", () => {
      const result = setup(props());
      expect(result.current.name).toBe("Genesis");
    });

    it("falls back to the bookId when the name is unknown", () => {
      const result = setup(props({ bookId: "XYZ" }), {
        bookNames: new Map(),
        booksMap: new Map(),
        profiles: new Map([
          ["u1", makeProfile("u1")],
          ["u2", makeProfile("u2")],
        ]),
      });
      expect(result.current.name).toBe("XYZ");
    });
  });

  describe("isExpanded / handleBookClick", () => {
    it("starts collapsed", () => {
      const result = setup(props());
      expect(result.current.isExpanded).toBe(false);
    });

    it("toggles expansion on each click", () => {
      const result = setup(props());
      act(() => result.current.handleBookClick());
      expect(result.current.isExpanded).toBe(true);
      act(() => result.current.handleBookClick());
      expect(result.current.isExpanded).toBe(false);
    });
  });

  describe("usersIconData", () => {
    it("builds icon data for each user (up to MAX_ICONS)", () => {
      const result = setup(props({ usersId: ["u1", "u2"] }));
      expect(result.current.usersIconData).toHaveLength(2);
      expect(result.current.usersIconData[0]).toEqual({
        key: "u1",
        pictureUrl: undefined,
        color: "rgb(1, 2, 3)",
        icon: "person",
      });
    });

    it("keeps a picture url when present and normalizes null to undefined", () => {
      const result = setup(props({ usersId: ["u1", "u2"] }), {
        profiles: new Map([
          ["u1", makeProfile("u1", { pictureUrl: "http://a.png" })],
          ["u2", makeProfile("u2", { pictureUrl: null })],
        ]),
      });
      expect(result.current.usersIconData[0]!.pictureUrl).toBe("http://a.png");
      expect(result.current.usersIconData[1]!.pictureUrl).toBeUndefined();
    });

    it("caps icons at 7 and reports the remaining as extraUsers", () => {
      const ids = Array.from({ length: 9 }, (_, i) => `u${i + 1}`);
      const profiles = new Map(
        ids.slice(0, 7).map((id) => [id, makeProfile(id)])
      );
      const result = setup(props({ usersId: ids }), { profiles });
      expect(result.current.usersIconData).toHaveLength(7);
      expect(result.current.extraUsers).toBe(2);
    });

    it("reports extraUsers as undefined when at or below the cap", () => {
      const result = setup(props({ usersId: ["u1", "u2"] }));
      expect(result.current.extraUsers).toBeUndefined();
    });

    it("throws when a user's profile is missing", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() =>
        setup(props({ usersId: ["ghost"] }), { profiles: new Map() })
      ).toThrow('useBook: profile not found for id "ghost"');
      consoleError.mockRestore();
    });
  });

  describe("chaptersData", () => {
    it("creates one entry per chapter from the translation books map", () => {
      const result = setup(props(), {
        booksMap: new Map([["GEN", { numberOfChapters: 3 }]]),
      });
      expect(result.current.chaptersData).toHaveLength(3);
      expect(result.current.chaptersData.map((c) => c.number)).toEqual([
        1, 2, 3,
      ]);
    });

    it("creates no chapters when the book is missing from the books map", () => {
      const result = setup(props(), { booksMap: new Map() });
      expect(result.current.chaptersData).toHaveLength(0);
    });

    it("attaches reading users to the matching chapter", () => {
      const result = setup(props({ chaptersReading: { 2: ["u1"] } }));
      expect(result.current.chaptersData[1]!.usersData).toHaveLength(1);
      expect(result.current.chaptersData[0]!.usersData).toHaveLength(0);
    });

    it("ignores reading ids that are not among the rendered icons", () => {
      const result = setup(props({ chaptersReading: { 1: ["ghost"] } }));
      expect(result.current.chaptersData[0]!.usersData).toHaveLength(0);
    });

    // `openPassage` opens the chapter and leaves Today in one action, so the
    // hook's whole job here is to name the right target.
    it("opens the clicked chapter, letting the default translation apply", () => {
      const result = setup(props());
      act(() => result.current.chaptersData[0]!.handleClick());
      expect(openPassage).toHaveBeenCalledWith({ bookId: "GEN", chapter: 1 });
    });
  });
});
