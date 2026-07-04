import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useContainer } from "../../../../packages/scripture-map/hooks/useContainer";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

describe("useContainer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup() {
    const result = { current: [] as ReturnType<typeof useContainer> };

    function TestComponent() {
      result.current = useContainer();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("returns an empty array when arrangement is null", () => {
    (useScriptureMapContext as Mock).mockReturnValue({
      arrangement: null,
    });
    const result = setup();
    expect(result.current).toEqual([]);
  });

  it("returns an empty array when arrangement is undefined", () => {
    (useScriptureMapContext as Mock).mockReturnValue({
      arrangement: undefined,
    });
    const result = setup();
    expect(result.current).toEqual([]);
  });

  it("returns testaments in reversed order", () => {
    const testaments = [
      { name: "OT", sections: [] },
      { name: "NT", sections: [] },
    ];
    (useScriptureMapContext as Mock).mockReturnValue({
      arrangement: { testaments },
    });
    const result = setup();
    expect(result.current).toHaveLength(2);
    expect(result.current[0]!.testament.name).toBe("NT");
    expect(result.current[1]!.testament.name).toBe("OT");
  });

  it("maps each testament to { key, testament, testamentIndex }", () => {
    const testaments = [{ name: "OT", sections: [] }];
    (useScriptureMapContext as Mock).mockReturnValue({
      arrangement: { testaments },
    });
    const result = setup();
    expect(result.current[0]).toEqual({
      key: "OT",
      testament: testaments[0],
      testamentIndex: 0,
    });
  });

  it("assigns testamentIndex based on reversed position", () => {
    const testaments = [
      { name: "OT", sections: [] },
      { name: "NT", sections: [] },
      { name: "AP", sections: [] },
    ];
    (useScriptureMapContext as Mock).mockReturnValue({
      arrangement: { testaments },
    });
    const result = setup();
    expect(result.current[0]!.testament.name).toBe("AP");
    expect(result.current[0]!.testamentIndex).toBe(0);
    expect(result.current[2]!.testament.name).toBe("OT");
    expect(result.current[2]!.testamentIndex).toBe(2);
  });
});
