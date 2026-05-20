import { render } from "preact";
import { act } from "preact/test-utils";
import { useTestamentToggle } from "scriptureMap2D.hooks.useTestamentToggle";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useTestamentContext } from "scriptureMap2D.contexts.Testament.TestamentContext";

jest.mock(
  "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext",
  () => ({
    useScriptureMap2DContext: jest.fn(),
  })
);

jest.mock("scriptureMap2D.contexts.Testament.TestamentContext", () => ({
  useTestamentContext: jest.fn(),
}));

describe("useTestamentToggle", () => {
  let container: HTMLDivElement;
  const translate = jest.fn((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}(${JSON.stringify(vars)})` : key
  );

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    translate.mockImplementation(
      (key: string, vars?: Record<string, unknown>) =>
        vars ? `${key}(${JSON.stringify(vars)})` : key
    );
    (useScriptureMap2DContext as jest.Mock).mockReturnValue({ translate });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup(testament: object, showingContent = false) {
    (useTestamentContext as jest.Mock).mockReturnValue({ testament });
    const result = {
      current: null as unknown as ReturnType<typeof useTestamentToggle>,
    };

    function TestComponent() {
      result.current = useTestamentToggle({ showingContent });
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("sums book counts across all sections", () => {
    const testament = {
      name: "OT",
      sections: [{ books: [1, 2, 3] }, { books: [4, 5] }],
    };
    const result = setup(testament);
    expect(result.current.toggleDescriptionContent).toContain('"count":5');
  });

  it("returns keyboard_arrow_up when showingContent is true", () => {
    const testament = { name: "NT", translationKey: undefined, sections: [] };
    const result = setup(testament, true);
    expect(result.current.toggleArrowContent).toBe("keyboard_arrow_up");
  });

  it("returns keyboard_arrow_down when showingContent is false", () => {
    const testament = { name: "NT", sections: [] };
    const result = setup(testament, false);
    expect(result.current.toggleArrowContent).toBe("keyboard_arrow_down");
  });

  it("uses translationKey for title when present", () => {
    translate.mockImplementation((key: string) => `[${key}]`);
    const testament = { name: "OT", translationKey: "ot-key", sections: [] };
    const result = setup(testament);
    expect(result.current.toggleTitleContent).toBe("[ot-key]");
  });

  it("falls back to testament.name for title when translationKey is absent", () => {
    translate.mockImplementation((key: string) => `[${key}]`);
    const testament = { name: "OT", translationKey: undefined, sections: [] };
    const result = setup(testament);
    expect(result.current.toggleTitleContent).toBe("[OT]");
  });

  it("counts zero books when testament has no sections", () => {
    const testament = { name: "NT", sections: [] };
    const result = setup(testament);
    expect(result.current.toggleDescriptionContent).toContain('"count":0');
  });
});
