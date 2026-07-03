import type { TestamentInfo } from "../../../../packages/seed-bible-utils/domain/models/arrangement";
import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TestamentProvider,
  useTestamentContext,
} from "../../../../packages/scripture-map/contexts/Testament/TestamentContext";
import type { TestamentContextType } from "../../../../packages/scripture-map/contexts/Testament/TestamentContext";

describe("TestamentContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("throws when useTestamentContext is called outside a provider", () => {
    function TestComponent() {
      useTestamentContext();
      return null;
    }

    expect(() => {
      act(() => render(<TestComponent />, container));
    }).toThrow("useTestamentContext must be used within a TestamentContext");
  });

  it("returns the provided value inside a provider", () => {
    const value: TestamentContextType = {
      testament: { name: "OT", sections: [] },
      testamentIndex: 0,
    };
    const result = { current: null as unknown as TestamentContextType };

    function TestComponent() {
      result.current = useTestamentContext();
      return null;
    }

    act(() =>
      render(
        <TestamentProvider value={value}>
          <TestComponent />
        </TestamentProvider>,
        container
      )
    );

    expect(result.current).toBe(value);
  });

  it("passes testament and testamentIndex correctly", () => {
    const testament: TestamentInfo = {
      name: "NT",
      sections: [
        {
          name: "Gospels",
          books: [],
          color: "#FFFFFF",
          path: {
            arrangementName: "Traditional",
            testamentIndex: 0,
            sectionIndex: 0,
          },
        },
      ],
    };
    const value: TestamentContextType = { testament, testamentIndex: 1 };
    const result = { current: null as unknown as TestamentContextType };

    function TestComponent() {
      result.current = useTestamentContext();
      return null;
    }

    act(() =>
      render(
        <TestamentProvider value={value}>
          <TestComponent />
        </TestamentProvider>,
        container
      )
    );

    expect(result.current.testament).toBe(testament);
    expect(result.current.testamentIndex).toBe(1);
  });

  it("renders children", () => {
    const value: TestamentContextType = {
      testament: { name: "OT", sections: [] },
      testamentIndex: 0,
    };

    act(() =>
      render(
        <TestamentProvider value={value}>
          <div id="child">hello</div>
        </TestamentProvider>,
        container
      )
    );

    expect(container.querySelector("#child")).not.toBeNull();
  });

  it("reflects updated value when re-rendered", () => {
    const value1: TestamentContextType = {
      testament: { name: "OT", sections: [] },
      testamentIndex: 0,
    };
    const value2: TestamentContextType = {
      testament: { name: "NT", sections: [] },
      testamentIndex: 1,
    };
    const result = { current: null as unknown as TestamentContextType };

    function TestComponent() {
      result.current = useTestamentContext();
      return null;
    }

    act(() =>
      render(
        <TestamentProvider value={value1}>
          <TestComponent />
        </TestamentProvider>,
        container
      )
    );
    expect(result.current.testamentIndex).toBe(0);

    act(() =>
      render(
        <TestamentProvider value={value2}>
          <TestComponent />
        </TestamentProvider>,
        container
      )
    );
    expect(result.current.testamentIndex).toBe(1);
  });
});
