import { render } from "preact";
import { act } from "preact/test-utils";
import { useScriptureMap2DWrapper } from "scriptureMap2D.hooks.useScriptureMap2DWrapper";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";

jest.mock(
  "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext",
  () => ({
    useScriptureMap2DContext: jest.fn(),
  })
);

describe("useScriptureMap2DWrapper", () => {
  let container: HTMLDivElement;
  const getBibleLayoutMeasurement = jest.fn(() => 10);

  function makeContext(overrides: Record<string, unknown> = {}) {
    return {
      bookWidth: 100,
      chapterGap: 2,
      chapterWidth: 12,
      chapterHeight: 12,
      scaleFactor: 1,
      isMobile: false,
      scriptureMap3DConfigProvider: { getBibleLayoutMeasurement },
      ...overrides,
    };
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(makeContext());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useScriptureMap2DWrapper>,
    };

    function TestComponent() {
      result.current = useScriptureMap2DWrapper();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("sets --scale-factor from context scaleFactor", () => {
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(
      makeContext({ scaleFactor: 1.5 })
    );
    const result = setup();
    expect(result.current.style["--scale-factor"]).toBe(1.5);
  });

  it("formats --book-width with px unit", () => {
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(
      makeContext({ bookWidth: 200 })
    );
    const result = setup();
    expect(result.current.style["--book-width"]).toBe("200px");
  });

  it("formats --chapter-gap with px unit", () => {
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(
      makeContext({ chapterGap: 4 })
    );
    const result = setup();
    expect(result.current.style["--chapter-gap"]).toBe("4px");
  });

  it("formats --chapter-width with px unit", () => {
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(
      makeContext({ chapterWidth: 16 })
    );
    const result = setup();
    expect(result.current.style["--chapter-width"]).toBe("16px");
  });

  it("formats --chapter-height with px unit", () => {
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(
      makeContext({ chapterHeight: 20 })
    );
    const result = setup();
    expect(result.current.style["--chapter-height"]).toBe("20px");
  });

  it("sets paddingBottom to 40px when isMobile is true", () => {
    (useScriptureMap2DContext as jest.Mock).mockReturnValue(
      makeContext({ isMobile: true })
    );
    const result = setup();
    expect(result.current.style.paddingBottom).toBe("40px");
  });

  it("sets paddingBottom to 16px when isMobile is false", () => {
    const result = setup();
    expect(result.current.style.paddingBottom).toBe("16px");
  });
});
