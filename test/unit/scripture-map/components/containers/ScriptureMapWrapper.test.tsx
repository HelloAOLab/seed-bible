import { render } from "preact";
import { act } from "preact/test-utils";
import { ScriptureMapWrapper } from "scriptureMap.components.containers.ScriptureMapWrapper";
import { useScriptureMapWrapper } from "scriptureMap.hooks.useScriptureMapWrapper";

jest.mock("scriptureMap.hooks.useScriptureMapWrapper", () => ({
  useScriptureMapWrapper: jest.fn(),
}));

jest.mock("scriptureMap.components.containers.Settings", () => ({
  Settings: () => <div data-testid="settings" />,
}));

jest.mock("scriptureMap.components.containers.Container", () => ({
  Container: () => <div data-testid="container" />,
}));

jest.mock("scriptureMap.components.containers.Controls", () => ({
  Controls: () => <div data-testid="controls" />,
}));

function makeHookResult(style: React.CSSProperties = {}) {
  return { style };
}

describe("ScriptureMapWrapper", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapWrapper as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(style: React.CSSProperties = {}) {
    (useScriptureMapWrapper as jest.Mock).mockReturnValue(
      makeHookResult(style)
    );
    act(() => render(<ScriptureMapWrapper />, container));
    return container;
  }

  function wrapper() {
    return container.querySelector<HTMLDivElement>(".scripture-map-wrapper");
  }

  describe("structure", () => {
    it("renders the .scripture-map-wrapper div", () => {
      setup();
      expect(wrapper()).not.toBeNull();
    });

    it("renders Settings inside the wrapper", () => {
      setup();
      expect(
        wrapper()!.querySelector("[data-testid='settings']")
      ).not.toBeNull();
    });

    it("renders Container inside the wrapper", () => {
      setup();
      expect(
        wrapper()!.querySelector("[data-testid='container']")
      ).not.toBeNull();
    });

    it("renders Controls inside the wrapper", () => {
      setup();
      expect(
        wrapper()!.querySelector("[data-testid='controls']")
      ).not.toBeNull();
    });
  });

  describe("style", () => {
    it("applies paddingBottom from hook style to the wrapper", () => {
      setup({ paddingBottom: "40px" });
      expect(wrapper()!.style.paddingBottom).toBe("40px");
    });

    it("applies a different paddingBottom when hook returns a different value", () => {
      setup({ paddingBottom: "16px" });
      expect(wrapper()!.style.paddingBottom).toBe("16px");
    });

    it("applies no paddingBottom when hook style omits it", () => {
      setup({});
      expect(wrapper()!.style.paddingBottom).toBe("");
    });
  });
});
