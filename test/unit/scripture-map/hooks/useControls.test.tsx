import { render } from "preact";
import { act } from "preact/test-utils";
import { useControls } from "scriptureMap.hooks.useControls";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

describe("useControls", () => {
  let container: HTMLDivElement;
  const setScaleFactor = jest.fn();
  const handleZoomIn = jest.fn();
  const handleZoomOut = jest.fn();
  const translate = jest.fn((key: string) => key);
  const CapitalizeFirstLetter = jest.fn(
    (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  );

  function makeContext(scaleFactor = 1) {
    return {
      scaleFactor,
      setScaleFactor,
      translate,
      CapitalizeFirstLetter,
      handleZoomIn,
      handleZoomOut,
    };
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as jest.Mock).mockReturnValue(makeContext());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.clearAllMocks();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useControls>,
    };

    function TestComponent() {
      result.current = useControls();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("currZoom is scaleFactor * 100 rounded", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(makeContext(0.75));
    const result = setup();
    expect(result.current.currZoom).toBe(75);
  });

  it("currZoom rounds the scaled value", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(makeContext(0.556));
    const result = setup();
    expect(result.current.currZoom).toBe(56);
  });

  it("showOptions starts as false", () => {
    const result = setup();
    expect(result.current.showOptions).toBe(false);
  });

  it("toggleButtonClick sets showOptions to true", () => {
    const result = setup();
    act(() => result.current.toggleButtonClick());
    expect(result.current.showOptions).toBe(true);
  });

  it("toggleButtonClick called twice sets showOptions back to false", () => {
    const result = setup();
    act(() => result.current.toggleButtonClick());
    act(() => result.current.toggleButtonClick());
    expect(result.current.showOptions).toBe(false);
  });

  it("handleZoomLevelClick calls setScaleFactor with the given value", () => {
    const result = setup();
    act(() => result.current.handleZoomLevelClick(1.5));
    expect(setScaleFactor).toHaveBeenCalledWith(1.5);
  });

  it("handleZoomLevelClick closes the options panel", () => {
    const result = setup();
    act(() => result.current.toggleButtonClick());
    act(() => result.current.handleZoomLevelClick(1));
    expect(result.current.showOptions).toBe(false);
  });

  it("options closes if user clicks outside", () => {
    const result = setup();
    act(() => result.current.toggleButtonClick());

    const fakeButton = document.createElement("button");
    const fakeSelector = document.createElement("div");

    result.current.toggleButtonRef.current = fakeButton;
    result.current.zoomLevelSelectorRef.current = fakeSelector;

    act(() => {
      const outsideClickEvent = new MouseEvent("mousedown", { bubbles: true });
      document.dispatchEvent(outsideClickEvent);
    });

    expect(result.current.showOptions).toBe(false);
  });

  it("keeps the options panel open when clicking inside the panel", () => {
    const result = setup();
    act(() => result.current.toggleButtonClick());

    const fakeSelector = document.createElement("div");
    result.current.zoomLevelSelectorRef.current = fakeSelector;
    document.body.appendChild(fakeSelector);

    act(() => {
      const insideClickEvent = new MouseEvent("mousedown", { bubbles: true });
      fakeSelector.dispatchEvent(insideClickEvent);
    });

    expect(result.current.showOptions).toBe(true);
  });
});
