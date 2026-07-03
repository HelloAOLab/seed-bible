import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useScriptureMapWrapper } from "../../../../packages/scripture-map/hooks/useScriptureMapWrapper";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";
import { LayoutConfigProvider } from "../../../../packages/scripture-map/config/LayoutConfigProvider";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

describe("useScriptureMapWrapper", () => {
  let container: HTMLDivElement;
  const layoutConfigProvider = new LayoutConfigProvider();

  function makeContext(overrides: Record<string, unknown> = {}) {
    return {
      bookWidth: 100,
      chapterGap: 2,
      chapterWidth: 12,
      chapterHeight: 12,
      scaleFactor: 1,
      isMobile: false,
      layoutConfigProvider,
      ...overrides,
    };
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as Mock).mockReturnValue(makeContext());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useScriptureMapWrapper>,
    };

    function TestComponent() {
      result.current = useScriptureMapWrapper();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("sets --scale-factor from context scaleFactor", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ scaleFactor: 1.5 })
    );
    const result = setup();
    expect(result.current.style["--scale-factor"]).toBe(1.5);
  });

  it("formats --book-width with px unit", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ bookWidth: 200 })
    );
    const result = setup();
    expect(result.current.style["--book-width"]).toBe("200px");
  });

  it("formats --chapter-gap with px unit", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ chapterGap: 4 })
    );
    const result = setup();
    expect(result.current.style["--chapter-gap"]).toBe("4px");
  });

  it("formats --chapter-width with px unit", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ chapterWidth: 16 })
    );
    const result = setup();
    expect(result.current.style["--chapter-width"]).toBe("16px");
  });

  it("formats --chapter-height with px unit", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ chapterHeight: 20 })
    );
    const result = setup();
    expect(result.current.style["--chapter-height"]).toBe("20px");
  });

  it("sets paddingBottom to 40px when isMobile is true", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
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
