import { render } from "preact";
import { act } from "preact/test-utils";
import { useProjectStateSetter } from "scriptureMap.hooks.useProjectStateSetter";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

const defaultProjectStateStyle = {
  None: {},
  Assigned: {},
  InProgress: {},
  NeedsReview: {},
  Completed: {},
};

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    isInSelectionMode: false,
    projectStateStyle: defaultProjectStateStyle,
    onSelectionModeCheckboxClick: jest.fn(),
    onSelectionModeDoneButtonClick: jest.fn(),
    onStateSetterOptionClick: jest.fn(),
    onSelectionModeClearSelectionButtonClick: jest.fn(),
    translate: (key: string) => key,
    ...overrides,
  };
}

describe("useProjectStateSetter", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as jest.Mock).mockReturnValue(makeContext());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useProjectStateSetter>,
    };

    function TestComponent() {
      result.current = useProjectStateSetter();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("checkboxIconClass is base class when not in selection mode", () => {
    const result = setup();
    expect(result.current.checkboxIconClass).toBe("material-symbols-outlined");
  });

  it("checkboxIconClass appends ' checked' when in selection mode", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeContext({ isInSelectionMode: true })
    );
    const result = setup();
    expect(result.current.checkboxIconClass).toBe(
      "material-symbols-outlined checked"
    );
  });

  it("checkboxIconContent is empty string when not in selection mode", () => {
    const result = setup();
    expect(result.current.checkboxIconContent).toBe("");
  });

  it("checkboxIconContent is 'check' when in selection mode", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeContext({ isInSelectionMode: true })
    );
    const result = setup();
    expect(result.current.checkboxIconContent).toBe("check");
  });

  it("isInSelectionMode reflects the context value", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeContext({ isInSelectionMode: true })
    );
    const result = setup();
    expect(result.current.isInSelectionMode).toBe(true);
  });
});
