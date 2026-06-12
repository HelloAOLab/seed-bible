import { render } from "preact";
import { act } from "preact/test-utils";
import { Book } from "todayScreen.infrastructure.presentation.components.containers.Book";
import { useBook } from "todayScreen.infrastructure.presentation.hooks.useBook";

jest.mock("todayScreen.infrastructure.presentation.hooks.useBook", () => ({
  useBook: jest.fn(),
}));

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.Chapter",
  () => ({
    Chapter: jest.fn(() => <div data-testid="chapter" />),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.UserIcon",
  () => ({
    UserIcon: jest.fn(() => <div data-testid="user-icon" />),
  })
);

type BookResult = ReturnType<typeof useBook>;

function makeBookResult(overrides: Partial<BookResult> = {}): BookResult {
  return {
    name: "Genesis",
    usersIconData: [],
    extraUsers: undefined,
    isExpanded: false,
    handleBookClick: jest.fn(),
    chaptersData: [],
    ...overrides,
  } as unknown as BookResult;
}

describe("Book", () => {
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

  function setup(overrides: Partial<BookResult> = {}) {
    const result = makeBookResult(overrides);
    (useBook as jest.Mock).mockReturnValue(result);
    act(() =>
      render(<Book bookId="GEN" chaptersReading={{}} usersId={[]} />, container)
    );
    return result;
  }

  function bookEl() {
    return container.querySelector<HTMLDivElement>(".filtered-reading-book");
  }

  describe("structure", () => {
    it("renders the book name", () => {
      setup({ name: "Exodus" });
      expect(bookEl()!.querySelector("span")!.textContent).toBe("Exodus");
    });

    it("renders a UserIcon per usersIconData entry", () => {
      setup({
        usersIconData: [
          { key: "u1" },
          { key: "u2" },
          { key: "u3" },
        ] as unknown as BookResult["usersIconData"],
      });
      expect(
        container.querySelectorAll("[data-testid='user-icon']")
      ).toHaveLength(3);
    });

    it("renders no UserIcons when usersIconData is empty", () => {
      setup({ usersIconData: [] });
      expect(
        container.querySelectorAll("[data-testid='user-icon']")
      ).toHaveLength(0);
    });
  });

  describe("extra users", () => {
    it("renders the '+N' badge when extraUsers is set", () => {
      setup({ extraUsers: 5 } as Partial<BookResult>);
      const extra = container.querySelector(".filtered-reading-book-extra");
      expect(extra).not.toBeNull();
      expect(extra!.textContent).toBe("+5");
    });

    it("does not render the badge when extraUsers is undefined", () => {
      setup({ extraUsers: undefined } as Partial<BookResult>);
      expect(
        container.querySelector(".filtered-reading-book-extra")
      ).toBeNull();
    });
  });

  describe("expanded state", () => {
    it("adds the 'expanded' class and renders the chapters container when expanded", () => {
      setup({ isExpanded: true });
      expect(bookEl()!.className).toContain("expanded");
      expect(bookEl()!.querySelector(".chapters-container")).not.toBeNull();
    });

    it("renders a Chapter per chaptersData entry when expanded", () => {
      setup({
        isExpanded: true,
        chaptersData: [
          { key: "c1" },
          { key: "c2" },
        ] as unknown as BookResult["chaptersData"],
      });
      expect(
        container.querySelectorAll("[data-testid='chapter']")
      ).toHaveLength(2);
    });

    it("omits the 'expanded' class and chapters container when collapsed", () => {
      setup({ isExpanded: false });
      expect(bookEl()!.className).not.toContain("expanded");
      expect(bookEl()!.querySelector(".chapters-container")).toBeNull();
      expect(
        container.querySelectorAll("[data-testid='chapter']")
      ).toHaveLength(0);
    });
  });

  describe("interaction", () => {
    it("calls handleBookClick when the book is clicked", () => {
      const result = setup();
      act(() => bookEl()!.click());
      expect(result.handleBookClick).toHaveBeenCalledTimes(1);
    });

    it("does not call handleBookClick when clicking inside the chapters container (stops propagation)", () => {
      const result = setup({ isExpanded: true });
      const chapters = bookEl()!.querySelector<HTMLDivElement>(
        ".chapters-container"
      )!;
      act(() => chapters.click());
      expect(result.handleBookClick).not.toHaveBeenCalled();
    });
  });
});
