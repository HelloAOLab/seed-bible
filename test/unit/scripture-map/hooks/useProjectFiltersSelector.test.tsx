import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useProjectFiltersSelector } from "../../../../packages/scripture-map/hooks/useProjectFiltersSelector";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

type FilterMap = Map<string, boolean>;

const defaultProjectStateStyle = {
  Assigned: {
    backgroundColor: "blue",
    borderStyle: "solid",
    borderColor: "blue",
  },
  InProgress: {
    backgroundColor: "yellow",
    borderStyle: "solid",
    borderColor: "yellow",
  },
  NeedsReview: {
    backgroundColor: "orange",
    borderStyle: "solid",
    borderColor: "orange",
  },
  Completed: {
    backgroundColor: "green",
    borderStyle: "solid",
    borderColor: "green",
  },
};

function makeContext(projectFilters: FilterMap) {
  return {
    projectFilters,
    handleProjectFilterOptionClick: vi.fn(),
    projectStateStyle: defaultProjectStateStyle,
    translate: (key: string) => key,
  };
}

describe("useProjectFiltersSelector", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup(projectFilters: FilterMap) {
    (useScriptureMapContext as Mock).mockReturnValue(
      makeContext(projectFilters)
    );
    const result = {
      current: null as unknown as ReturnType<typeof useProjectFiltersSelector>,
    };

    function TestComponent() {
      result.current = useProjectFiltersSelector();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("allSelected is true when all filters are true", () => {
    const filters = new Map([
      ["Assigned", true],
      ["Completed", true],
    ]) as FilterMap;
    const result = setup(filters);
    expect(result.current.allSelected).toBe(true);
  });

  it("allSelected is false when any filter is false", () => {
    const filters = new Map([
      ["Assigned", true],
      ["Completed", false],
    ]) as FilterMap;
    const result = setup(filters);
    expect(result.current.allSelected).toBe(false);
  });

  it("selectorOptions have selected:false when allSelected is true", () => {
    const filters = new Map([
      ["Assigned", true],
      ["Completed", true],
    ]) as FilterMap;
    const result = setup(filters);
    result.current.selectorOptionsData.forEach((option) => {
      expect(option.selected).toBe(false);
    });
  });

  it("selectorOptions reflect individual filter values when not all selected", () => {
    const filters = new Map([
      ["Assigned", true],
      ["Completed", false],
    ]) as FilterMap;
    const result = setup(filters);
    const assignedOption = result.current.selectorOptionsData.find(
      (o) => o.key === "Assigned"
    );
    const completedOption = result.current.selectorOptionsData.find(
      (o) => o.key === "Completed"
    );
    expect(assignedOption?.selected).toBe(true);
    expect(completedOption?.selected).toBe(false);
  });

  it("allSelectorOptionContent title is the translation of 'all'", () => {
    const filters = new Map() as FilterMap;
    (useScriptureMapContext as Mock).mockReturnValue({
      ...makeContext(filters),
      translate: (key: string) => (key === "all" ? "All" : key),
    });
    const result = {
      current: null as unknown as ReturnType<typeof useProjectFiltersSelector>,
    };
    function TestComponent() {
      result.current = useProjectFiltersSelector();
      return null;
    }
    act(() => render(<TestComponent />, container));
    expect(result.current.allSelectorOptionContent.title).toBe("All");
  });
});
