import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useBook } from "todayScreen.infrastructure.presentation.hooks.useBook";
import { useTodayContext } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import { useSocialSectionContext } from "todayScreen.infrastructure.presentation.contexts.socialSection.SocialSectionContext";
import type { BookProps } from "todayScreen.infrastructure.presentation.components.containers.Book";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.socialSection.SocialSectionContext",
  () => ({
    useSocialSectionContext: jest.fn(),
  })
);

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
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
  const addTab = jest.fn();
  const getDefaultTranslation = jest.fn(() => "AAB");

  function configureContexts(options: {
    bookNames?: Map<string, string>;
    booksMap?: Map<string, { numberOfChapters: number }>;
    profiles?: Map<string, Profile>;
  }) {
    (useTodayContext as jest.Mock).mockReturnValue({
      bookNames: signal(options.bookNames ?? new Map([["GEN", "Genesis"]])),
      MaterialIcon,
      translationBooksMap: signal(
        options.booksMap ?? new Map([["GEN", { numberOfChapters: 3 }]])
      ),
      addTab,
      getDefaultTranslation,
    });
    (useSocialSectionContext as jest.Mock).mockReturnValue({
      userProfileMap:
        options.profiles ??
        new Map([
          ["u1", makeProfile("u1")],
          ["u2", makeProfile("u2")],
        ]),
    });
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(
    props: BookProps,
    options: Parameters<typeof configureContexts>[0] = {}
  ) {
    configureContexts(options);
    const result = { current: null as unknown as UseBookResult };
    function TestComponent() {
      result.current = useBook(props);
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
        MaterialIcon,
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
      const consoleError = jest
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

    it("opens the chapter in a new tab when a chapter is clicked", () => {
      const result = setup(props());
      act(() => result.current.chaptersData[0]!.handleClick());
      expect(getDefaultTranslation).toHaveBeenCalled();
      expect(addTab).toHaveBeenCalledWith("GEN", 1, "AAB");
    });
  });
});
