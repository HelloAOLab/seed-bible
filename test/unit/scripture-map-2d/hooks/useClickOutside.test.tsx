import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import { useClickOutside } from "scriptureMap2D.hooks.useClickOutside";

describe("useClickOutside", () => {
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
    const callback = jest.fn();
    const innerRef = createRef<HTMLDivElement>();

    function TestComponent() {
      useClickOutside([innerRef], callback);
      return <div ref={innerRef} id="inner-element" />;
    }

    act(() => render(<TestComponent />, container));
    return { callback, innerRef };
  }

  describe("mousedown", () => {
    it("calls callback when mousedown is outside all refs", () => {
      const { callback } = setup();
      const outside = document.createElement("div");
      document.body.appendChild(outside);

      act(() => {
        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(callback).toHaveBeenCalled();
      document.body.removeChild(outside);
    });

    it("does not call callback when mousedown is on the ref element", () => {
      const { callback, innerRef } = setup();

      act(() => {
        innerRef.current!.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true })
        );
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("does not call callback when mousedown is on a child of the ref element", () => {
      const { callback, innerRef } = setup();
      const child = document.createElement("span");
      innerRef.current!.appendChild(child);

      act(() => {
        child.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("focusin", () => {
    it("calls callback when focusin is outside all refs", () => {
      const { callback } = setup();
      const outside = document.createElement("input");
      document.body.appendChild(outside);

      act(() => {
        outside.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      });

      expect(callback).toHaveBeenCalled();
      document.body.removeChild(outside);
    });

    it("does not call callback when focusin is on the ref element", () => {
      const { callback, innerRef } = setup();

      act(() => {
        innerRef.current!.dispatchEvent(
          new FocusEvent("focusin", { bubbles: true })
        );
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  it("removes event listeners when the component unmounts", () => {
    setup();
    const removeSpy = jest.spyOn(document, "removeEventListener");

    act(() => render(null, container));

    expect(removeSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("focusin", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("calls callback once per outside interaction", () => {
    const { callback } = setup();
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    act(() => {
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(callback).toHaveBeenCalledTimes(2);
    document.body.removeChild(outside);
  });
});
