import { render } from "preact";
import { act } from "preact/test-utils";
import type { MutableRef } from "preact/hooks";
import { useClickOutside } from "todayScreen.infrastructure.presentation.hooks.useClickOutside";

type Ref = MutableRef<HTMLElement | null>;

describe("useClickOutside", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function makeEl(): HTMLElement {
    const el = document.createElement("div");
    container.appendChild(el);
    return el;
  }

  function setup(refs: Ref[], callback: () => void) {
    function TestComponent() {
      useClickOutside(refs, callback);
      return null;
    }
    act(() => render(<TestComponent />, container));
  }

  function fireMouseDown(target: HTMLElement) {
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  }

  function fireFocusIn(target: HTMLElement) {
    target.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  }

  it("invokes the callback on a mousedown outside all refs", () => {
    const ref = { current: makeEl() };
    const outside = makeEl();
    const callback = jest.fn();
    setup([ref], callback);

    fireMouseDown(outside);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("invokes the callback on a focusin outside all refs", () => {
    const ref = { current: makeEl() };
    const outside = makeEl();
    const callback = jest.fn();
    setup([ref], callback);

    fireFocusIn(outside);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not invoke the callback when clicking inside a ref", () => {
    const el = makeEl();
    const child = document.createElement("span");
    el.appendChild(child);
    const callback = jest.fn();
    setup([{ current: el }], callback);

    fireMouseDown(el);
    expect(callback).not.toHaveBeenCalled();

    // A descendant of the ref is also "inside".
    fireMouseDown(child);
    expect(callback).not.toHaveBeenCalled();
  });

  it("treats a null ref as not-outside, so the callback never fires", () => {
    const callback = jest.fn();
    setup([{ current: null }], callback);

    fireMouseDown(makeEl());
    expect(callback).not.toHaveBeenCalled();
  });

  describe("with multiple refs", () => {
    it("fires only when the target is outside every ref", () => {
      const refA = { current: makeEl() };
      const refB = { current: makeEl() };
      const outside = makeEl();
      const callback = jest.fn();
      setup([refA, refB], callback);

      // Inside one of the refs → not outside → no call.
      fireMouseDown(refB.current);
      expect(callback).not.toHaveBeenCalled();

      // Outside both → call.
      fireMouseDown(outside);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  it("removes the listeners on unmount", () => {
    const ref = { current: makeEl() };
    const outside = makeEl();
    const callback = jest.fn();
    setup([ref], callback);

    act(() => render(null, container));

    // container (and its children) are detached, but the document listeners
    // would still fire if not cleaned up — dispatch from a body-level element.
    const stray = document.createElement("div");
    document.body.appendChild(stray);
    fireMouseDown(stray);
    fireFocusIn(stray);
    expect(callback).not.toHaveBeenCalled();
    stray.remove();
  });
});
