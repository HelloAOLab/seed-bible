import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Container } from "../../../../../packages/scripture-map/components/containers/Container";
import { useContainer } from "../../../../../packages/scripture-map/hooks/useContainer";

vi.mock("../../../../../packages/scripture-map/hooks/useContainer", () => ({
  useContainer: vi.fn(),
}));

vi.mock(
  "../../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(() => ({
      showTestamentLabels: true,
      showSectionLabels: true,
    })),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/TestamentContainer",
  () => ({
    TestamentContainer: ({ testamentIndex }: { testamentIndex: number }) => (
      <div data-testid="testament-container" data-index={testamentIndex} />
    ),
  })
);

describe("Container", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useContainer as Mock).mockReturnValue([]);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup() {
    act(() => render(<Container />, container));
    return container;
  }

  describe("structure", () => {
    it("renders the outer div with class scripture-map-container", () => {
      setup();
      expect(
        container.querySelector(".scripture-map-container")
      ).not.toBeNull();
    });

    it("renders no TestamentContainers when data is empty", () => {
      setup();
      expect(
        container.querySelectorAll("[data-testid='testament-container']")
      ).toHaveLength(0);
    });
  });

  describe("mapping over testamentContainersData", () => {
    it("renders one TestamentContainer when data has one item", () => {
      (useContainer as Mock).mockReturnValue([
        { testamentIndex: 0, testament: { name: "OT", sections: [] } },
      ]);
      setup();
      expect(
        container.querySelectorAll("[data-testid='testament-container']")
      ).toHaveLength(1);
    });

    it("renders multiple TestamentContainers when data has multiple items", () => {
      (useContainer as Mock).mockReturnValue([
        { testamentIndex: 0, testament: { name: "OT", sections: [] } },
        { testamentIndex: 1, testament: { name: "NT", sections: [] } },
      ]);
      setup();
      expect(
        container.querySelectorAll("[data-testid='testament-container']")
      ).toHaveLength(2);
    });

    it("passes props from each data item to TestamentContainer", () => {
      (useContainer as Mock).mockReturnValue([
        { testamentIndex: 0, testament: { name: "OT", sections: [] } },
        { testamentIndex: 1, testament: { name: "NT", sections: [] } },
      ]);
      setup();
      const items = container.querySelectorAll(
        "[data-testid='testament-container']"
      );
      expect(items[0]!.getAttribute("data-index")).toBe("0");
      expect(items[1]!.getAttribute("data-index")).toBe("1");
    });
  });
});
