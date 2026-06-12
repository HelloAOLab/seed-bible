import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { SearchSection } from "todayScreen.infrastructure.presentation.components.containers.SearchSection";
import { useSearchSection } from "todayScreen.infrastructure.presentation.hooks.useSearchSection";
import { SeedBibleIcon } from "todayScreen.infrastructure.presentation.components.ui.SeedBibleIcon";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useSearchSection",
  () => ({
    useSearchSection: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.TitledSection",
  () => ({
    TitledSection: jest.fn(
      ({ title, children }: { title: string; children: ComponentChildren }) => (
        <div data-testid="titled-section" data-title={title}>
          {children}
        </div>
      )
    ),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.SearchBar",
  () => ({
    SearchBar: jest.fn(() => <div data-testid="search-bar" />),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.SeedBibleIcon",
  () => ({
    SeedBibleIcon: jest.fn(() => <div data-testid="seed-bible-icon" />),
  })
);

type Result = ReturnType<typeof useSearchSection>;

function makeResult(overrides: Partial<Result> = {}): Result {
  return {
    title: "Go somewhere new",
    selectorText: "Book selector",
    openBookSelector: jest.fn(),
    seedBibleIconStyle: { width: "20px" },
    ...overrides,
  } as unknown as Result;
}

describe("SearchSection", () => {
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

  function setup(overrides: Partial<Result> = {}) {
    const result = makeResult(overrides);
    (useSearchSection as jest.Mock).mockReturnValue(result);
    act(() => render(<SearchSection />, container));
    return result;
  }

  const q = (sel: string) => container.querySelector(sel);

  it("renders the titled section with the title", () => {
    setup({ title: "Explore" });
    const section = q("[data-testid='titled-section']")!;
    expect(section.getAttribute("data-title")).toBe("Explore");
  });

  it("renders the book selector button with the selector text", () => {
    setup({ selectorText: "Choose a book" });
    const button = q(".book-selector-button")!;
    expect(button).not.toBeNull();
    expect(button.textContent).toBe("Choose a book");
  });

  it("renders the SeedBibleIcon with the provided style", () => {
    const seedBibleIconStyle = { width: "32px", height: "32px" };
    setup({ seedBibleIconStyle });
    expect(q("[data-testid='seed-bible-icon']")).not.toBeNull();
    expect((SeedBibleIcon as jest.Mock).mock.calls[0]![0].style).toBe(
      seedBibleIconStyle
    );
  });

  it("renders the SearchBar", () => {
    setup();
    expect(q("[data-testid='search-bar']")).not.toBeNull();
  });

  it("calls openBookSelector when the selector button is clicked", () => {
    const openBookSelector = jest.fn();
    setup({ openBookSelector });
    act(() =>
      container
        .querySelector<HTMLButtonElement>(".book-selector-button")!
        .click()
    );
    expect(openBookSelector).toHaveBeenCalledTimes(1);
  });
});
