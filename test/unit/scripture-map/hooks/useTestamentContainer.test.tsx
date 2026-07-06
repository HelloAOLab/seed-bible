import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useTestamentContainer } from "../../../../packages/scripture-map/hooks/useTestamentContainer";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

describe("useTestamentContainer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup(showTestamentLabels = false) {
    (useScriptureMapContext as Mock).mockReturnValue({
      showTestamentLabels,
    });
    const result = {
      current: null as unknown as ReturnType<typeof useTestamentContainer>,
    };

    function TestComponent() {
      result.current = useTestamentContainer();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("showContent starts as true", () => {
    const result = setup();
    expect(result.current.showContent).toBe(true);
  });

  it("toggleshowContent flips showContent to false", () => {
    const result = setup();
    act(() => result.current.toggleshowContent());
    expect(result.current.showContent).toBe(false);
  });

  it("toggleshowContent called twice restores showContent to true", () => {
    const result = setup();
    act(() => result.current.toggleshowContent());
    act(() => result.current.toggleshowContent());
    expect(result.current.showContent).toBe(true);
  });

  it("showTestamentLabels is false when context returns false", () => {
    const result = setup(false);
    expect(result.current.showTestamentLabels).toBe(false);
  });

  it("showTestamentLabels is true when context returns true", () => {
    const result = setup(true);
    expect(result.current.showTestamentLabels).toBe(true);
  });
});
