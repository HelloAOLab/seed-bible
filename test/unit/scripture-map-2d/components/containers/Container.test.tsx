import { render } from "preact";
import { act } from "preact/test-utils";
import { Container } from "scriptureMap2D.components.containers.Container";
import { useContainer } from "scriptureMap2D.hooks.useContainer";

jest.mock("scriptureMap2D.hooks.useContainer", () => ({
  useContainer: jest.fn(),
}));

jest.mock("scriptureMap2D.components.containers.TestamentContainer", () => ({
  TestamentContainer: ({ testamentIndex }: { testamentIndex: number }) => (
    <div data-testid="testament-container" data-index={testamentIndex} />
  ),
}));

describe("Container", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useContainer as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup() {
    act(() => render(<Container />, container));
    return container;
  }

  describe("structure", () => {
    it("renders the outer div with class scripture-map-2d-container", () => {
      setup();
      expect(
        container.querySelector(".scripture-map-2d-container")
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
      (useContainer as jest.Mock).mockReturnValue([
        { testamentIndex: 0, testament: { name: "OT", sections: [] } },
      ]);
      setup();
      expect(
        container.querySelectorAll("[data-testid='testament-container']")
      ).toHaveLength(1);
    });

    it("renders multiple TestamentContainers when data has multiple items", () => {
      (useContainer as jest.Mock).mockReturnValue([
        { testamentIndex: 0, testament: { name: "OT", sections: [] } },
        { testamentIndex: 1, testament: { name: "NT", sections: [] } },
      ]);
      setup();
      expect(
        container.querySelectorAll("[data-testid='testament-container']")
      ).toHaveLength(2);
    });

    it("passes props from each data item to TestamentContainer", () => {
      (useContainer as jest.Mock).mockReturnValue([
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
