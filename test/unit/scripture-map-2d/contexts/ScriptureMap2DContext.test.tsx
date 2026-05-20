import { render } from "preact";
import { act } from "preact/test-utils";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";

jest.mock(
  "scriptureMap2D.contexts.ScriptureMap2D.useScriptureMap2DProvider",
  () => ({
    useScriptureMap2DProvider: jest.fn(() => ({})),
  })
);

describe("ScriptureMap2DContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("throws when useScriptureMap2DContext is called outside a provider", () => {
    function TestComponent() {
      useScriptureMap2DContext();
      return null;
    }

    expect(() => {
      act(() => render(<TestComponent />, container));
    }).toThrow(
      "useScriptureMap2DContext must be used within a ScriptureMap2DContext"
    );
  });
});
