import { render } from "preact";
import { act } from "preact/test-utils";
import { useWhyChanged } from "scriptureMap.hooks.useWhyChanged";

describe("useWhyChanged", () => {
  let container: HTMLDivElement;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    consoleSpy.mockRestore();
  });

  function TestComponent({ name, value }: { name: string; value: unknown }) {
    useWhyChanged(name, value);
    return null;
  }

  it("does not log on the first render", () => {
    act(() => render(<TestComponent name="count" value={0} />, container));

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("logs when the value changes", () => {
    act(() => render(<TestComponent name="count" value={1} />, container));
    act(() => render(<TestComponent name="count" value={2} />, container));

    expect(consoleSpy).toHaveBeenCalledWith("[WhyChanged] count changed:", {
      before: 1,
      after: 2,
    });
  });

  it("does not log when the value stays the same on re-render", () => {
    act(() => render(<TestComponent name="count" value={5} />, container));
    act(() => render(<TestComponent name="count" value={5} />, container));

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("logs the correct before/after for object references", () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };

    act(() => render(<TestComponent name="obj" value={obj1} />, container));
    act(() => render(<TestComponent name="obj" value={obj2} />, container));

    expect(consoleSpy).toHaveBeenCalledWith("[WhyChanged] obj changed:", {
      before: obj1,
      after: obj2,
    });
  });

  it("logs consecutive changes correctly", () => {
    act(() => render(<TestComponent name="x" value={1} />, container));
    act(() => render(<TestComponent name="x" value={2} />, container));
    act(() => render(<TestComponent name="x" value={3} />, container));

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenNthCalledWith(1, "[WhyChanged] x changed:", {
      before: 1,
      after: 2,
    });
    expect(consoleSpy).toHaveBeenNthCalledWith(2, "[WhyChanged] x changed:", {
      before: 2,
      after: 3,
    });
  });
});
