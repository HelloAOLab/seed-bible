import { render } from "preact";
import { act } from "preact/test-utils";
import { useSearchSection } from "todayScreen.infrastructure.presentation.hooks.useSearchSection";
import { useTodayContext } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(),
  })
);

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

const openBookSelector = jest.fn();

type Result = ReturnType<typeof useSearchSection>;

describe("useSearchSection", () => {
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

  function setup(secondaryFontColor = "#abcdef") {
    (useTodayContext as jest.Mock).mockReturnValue({
      translate: jest.fn((key: string) => key),
      openBookSelector,
      MaterialIcon,
      theme: { variables: { secondaryFontColor } },
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useSearchSection();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("translates the title and selector text", () => {
    const result = setup();
    expect(result.current.title).toBe("go-somewhere-new");
    expect(result.current.selectorText).toBe("books");
  });

  it("builds the seed-bible icon style from the theme", () => {
    const result = setup("rgb(10, 20, 30)");
    expect(result.current.seedBibleIconStyle).toEqual({
      width: "24px",
      height: "24px",
      backgroundColor: "rgb(10, 20, 30)",
    });
  });

  it("exposes the MaterialIcon", () => {
    const result = setup();
    expect(result.current.MaterialIcon).toBe(MaterialIcon);
  });

  it("forwards openBookSelector", () => {
    const result = setup();
    expect(result.current.openBookSelector).toBe(openBookSelector);
    act(() => result.current.openBookSelector());
    expect(openBookSelector).toHaveBeenCalledTimes(1);
  });
});
