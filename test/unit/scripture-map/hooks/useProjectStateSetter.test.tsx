import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useProjectStateSetter } from "../../../../packages/scripture-map/hooks/useProjectStateSetter";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

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
    onSelectionModeCheckboxClick: vi.fn(),
    onSelectionModeDoneButtonClick: vi.fn(),
    onStateSetterOptionClick: vi.fn(),
    onSelectionModeClearSelectionButtonClick: vi.fn(),
    translate: (key: string) => key,
    ...overrides,
  };
}

describe("useProjectStateSetter", () => {
  let container: HTMLDivElement;

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
    (useScriptureMapContext as Mock).mockReturnValue(
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
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ isInSelectionMode: true })
    );
    const result = setup();
    expect(result.current.checkboxIconContent).toBe("check");
  });

  it("isInSelectionMode reflects the context value", () => {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext({ isInSelectionMode: true })
    );
    const result = setup();
    expect(result.current.isInSelectionMode).toBe(true);
  });
});
