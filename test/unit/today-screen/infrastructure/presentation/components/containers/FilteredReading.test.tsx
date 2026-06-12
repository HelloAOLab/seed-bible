import { render } from "preact";
import { act } from "preact/test-utils";
import { FilteredReading } from "todayScreen.infrastructure.presentation.components.containers.FilteredReading";
import { Book } from "todayScreen.infrastructure.presentation.components.containers.Book";
import { useFilteredReading } from "todayScreen.infrastructure.presentation.hooks.useFilteredReading";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useFilteredReading",
  () => ({
    useFilteredReading: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.Book",
  () => ({
    Book: jest.fn(() => <div data-testid="book" />),
  })
);

type BooksData = ReturnType<typeof useFilteredReading>["booksData"];

function makeBook(overrides: Record<string, unknown> = {}) {
  return {
    key: "GEN",
    bookId: "GEN",
    chaptersReading: { 1: ["u1"] },
    usersId: ["u1"],
    ...overrides,
  };
}

describe("FilteredReading", () => {
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

  function setup(booksData: unknown[]) {
    (useFilteredReading as jest.Mock).mockReturnValue({
      booksData: booksData as unknown as BooksData,
    });
    act(() => render(<FilteredReading />, container));
  }

  function readingContainer() {
    return container.querySelector(".filtered-reading-container");
  }

  function books() {
    return container.querySelectorAll("[data-testid='book']");
  }

  it("renders nothing when there are no books", () => {
    setup([]);
    expect(readingContainer()).toBeNull();
    expect(books()).toHaveLength(0);
  });

  it("renders the container with one Book per entry", () => {
    setup([
      makeBook({ key: "GEN" }),
      makeBook({ key: "EXO", bookId: "EXO" }),
      makeBook({ key: "JHN", bookId: "JHN" }),
    ]);
    expect(readingContainer()).not.toBeNull();
    expect(books()).toHaveLength(3);
  });

  it("forwards the book props (without the key) to Book", () => {
    const book = makeBook({
      key: "GEN",
      bookId: "GEN",
      chaptersReading: { 1: ["u1", "u2"] },
      usersId: ["u1", "u2"],
    });
    setup([book]);

    const passedProps = (Book as jest.Mock).mock.calls[0]![0];
    expect(passedProps).toEqual({
      bookId: "GEN",
      chaptersReading: { 1: ["u1", "u2"] },
      usersId: ["u1", "u2"],
    });
    expect(passedProps).not.toHaveProperty("key");
  });
});
