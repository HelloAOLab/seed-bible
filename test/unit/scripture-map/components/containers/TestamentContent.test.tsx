import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TestamentContent,
  type SectionToggleData,
  type BooksContainerData,
  type BookData,
} from "../../../../../packages/scripture-map/components/containers/TestamentContent";
import { useTestamentContent } from "../../../../../packages/scripture-map/hooks/useTestamentContent";
import type { SectionInfo } from "../../../../../packages/seed-bible-utils/domain/models/arrangement";

vi.mock(
  "../../../../../packages/scripture-map/hooks/useTestamentContent",
  () => ({
    useTestamentContent: vi.fn(),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/SectionToggle",
  () => ({
    SectionToggle: ({
      sectionKey,
      showingContent,
    }: {
      sectionKey: string;
      showingContent: boolean | undefined;
    }) => (
      <div
        data-testid="section-toggle"
        data-section-key={sectionKey}
        data-showing={String(showingContent)}
      />
    ),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/ui/BooksContainer",
  () => ({
    BooksContainer: ({ children }: { children: preact.ComponentChildren }) => (
      <div data-testid="books-container">{children}</div>
    ),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/Book",
  () => ({
    Book: ({ bookId }: { bookId: string }) => (
      <div data-testid="book" data-book-id={bookId} />
    ),
  })
);

function makeSectionToggleData(
  overrides: Partial<SectionToggleData> = {}
): SectionToggleData {
  return {
    type: "sectionToggle",
    key: "toggle-0",
    section: {
      name: "Law",
      color: "#ff0000",
      books: [],
      path: { arrangementName: "default", testamentIndex: 0, sectionIndex: 0 },
    } as SectionInfo,
    sectionKey: "0-OT-0-Law",
    toggleShowSection: vi.fn(),
    showingContent: true,
    style: {},
    ...overrides,
  };
}

function makeBookData(overrides: Partial<BookData> = {}): BookData {
  return {
    key: "book-0",
    book: "Genesis",
    bookId: "gen",
    numberOfChapters: 50,
    chaptersVerseCount: [],
    isSubset: false,
    bookCoverBackgroundColor: "#000000",
    sectionName: "Law",
    readingEvents: [],
    readingSummary: {} as never,
    bookBorderGradientColors: undefined,
    bookUserPresence: {},
    bookUserPresenceColors: [],
    ...overrides,
  };
}

function makeBooksContainerData(
  content: BookData[] = [makeBookData()]
): BooksContainerData {
  return { type: "booksContainer", content };
}

describe("TestamentContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useTestamentContent as Mock).mockReturnValue({ itemsData: [] });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(
    hidden: boolean,
    itemsData: (SectionToggleData | BooksContainerData)[] = []
  ) {
    (useTestamentContent as Mock).mockReturnValue({ itemsData });
    act(() => render(<TestamentContent hidden={hidden} />, container));
    return container;
  }

  describe("structure", () => {
    it("renders the .testament-content div", () => {
      setup(false);
      expect(container.querySelector(".testament-content")).not.toBeNull();
    });

    it("adds the hidden class when hidden is true", () => {
      setup(true);
      expect(
        container
          .querySelector(".testament-content")!
          .classList.contains("hidden")
      ).toBe(true);
    });

    it("does not add the hidden class when hidden is false", () => {
      setup(false);
      expect(
        container
          .querySelector(".testament-content")!
          .classList.contains("hidden")
      ).toBe(false);
    });

    it("renders no children when itemsData is empty", () => {
      setup(false, []);
      expect(
        container.querySelector(".testament-content")!.children
      ).toHaveLength(0);
    });
  });

  describe("sectionToggle items", () => {
    it("renders a SectionToggle for a sectionToggle item", () => {
      setup(false, [makeSectionToggleData()]);
      expect(
        container.querySelectorAll("[data-testid='section-toggle']")
      ).toHaveLength(1);
    });

    it("renders multiple SectionToggles for multiple sectionToggle items", () => {
      setup(false, [
        makeSectionToggleData({ key: "t-0", sectionKey: "key-0" }),
        makeSectionToggleData({ key: "t-1", sectionKey: "key-1" }),
      ]);
      expect(
        container.querySelectorAll("[data-testid='section-toggle']")
      ).toHaveLength(2);
    });

    it("passes sectionKey to SectionToggle", () => {
      setup(false, [makeSectionToggleData({ sectionKey: "my-section-key" })]);
      expect(
        container
          .querySelector("[data-testid='section-toggle']")!
          .getAttribute("data-section-key")
      ).toBe("my-section-key");
    });

    it("passes showingContent to SectionToggle", () => {
      setup(false, [makeSectionToggleData({ showingContent: false })]);
      expect(
        container
          .querySelector("[data-testid='section-toggle']")!
          .getAttribute("data-showing")
      ).toBe("false");
    });
  });

  describe("booksContainer items", () => {
    it("renders a BooksContainer for a booksContainer item", () => {
      setup(false, [makeBooksContainerData()]);
      expect(
        container.querySelectorAll("[data-testid='books-container']")
      ).toHaveLength(1);
    });

    it("renders multiple BooksContainers for multiple booksContainer items", () => {
      setup(false, [makeBooksContainerData(), makeBooksContainerData()]);
      expect(
        container.querySelectorAll("[data-testid='books-container']")
      ).toHaveLength(2);
    });

    it("renders a Book for each entry in content", () => {
      setup(false, [
        makeBooksContainerData([
          makeBookData({ key: "b-0", bookId: "gen" }),
          makeBookData({ key: "b-1", bookId: "exo" }),
        ]),
      ]);
      expect(container.querySelectorAll("[data-testid='book']")).toHaveLength(
        2
      );
    });

    it("passes bookId to each Book", () => {
      setup(false, [
        makeBooksContainerData([
          makeBookData({ key: "b-0", bookId: "gen" }),
          makeBookData({ key: "b-1", bookId: "exo" }),
        ]),
      ]);
      const books = container.querySelectorAll("[data-testid='book']");
      expect(books[0]!.getAttribute("data-book-id")).toBe("gen");
      expect(books[1]!.getAttribute("data-book-id")).toBe("exo");
    });
  });

  describe("mixed items", () => {
    it("renders sectionToggle and booksContainer items together", () => {
      setup(false, [
        makeSectionToggleData(),
        makeBooksContainerData(),
        makeSectionToggleData({ key: "t-1" }),
      ]);
      expect(
        container.querySelectorAll("[data-testid='section-toggle']")
      ).toHaveLength(2);
      expect(
        container.querySelectorAll("[data-testid='books-container']")
      ).toHaveLength(1);
    });
  });
});
