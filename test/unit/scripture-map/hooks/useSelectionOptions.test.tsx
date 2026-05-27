import { render } from "preact";
import { act } from "preact/test-utils";
import { useSelectionOptions } from "scriptureMap.hooks.useSelectionOptions";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

describe("useSelectionOptions", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup(translate: (key: string) => string) {
    (useScriptureMapContext as jest.Mock).mockReturnValue({ translate });
    const result = {
      current: null as unknown as ReturnType<typeof useSelectionOptions>,
    };

    function TestComponent() {
      result.current = useSelectionOptions();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("clearSelectionContent concatenates clear and selection with a space", () => {
    const result = setup((key) => key);
    expect(result.current.clearSelectionContent).toBe("clear selection");
  });

  it("acceptSelectionContent is the translation of done", () => {
    const result = setup((key) => key.toUpperCase());
    expect(result.current.acceptSelectionContent).toBe("DONE");
  });

  it("uses the translation values from context", () => {
    const translations: Record<string, string> = {
      clear: "Clear",
      selection: "Selection",
      done: "Done",
    };
    const result = setup((key) => translations[key] ?? key);
    expect(result.current.clearSelectionContent).toBe("Clear Selection");
    expect(result.current.acceptSelectionContent).toBe("Done");
  });
});
