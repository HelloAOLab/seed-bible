import type { ComponentChildren } from "preact";
import { render } from "preact";
import { useRef } from "preact/hooks";
import { act } from "preact/test-utils";
import { useModalLayer } from "@packages/seed-bible/seed-bible/components/useModalFocus";

function Layer(props: {
  name: string;
  onEscape?: () => void;
  children?: ComponentChildren;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalLayer(ref, { onEscape: props.onEscape });
  return (
    <div ref={ref} tabIndex={-1} data-layer={props.name}>
      <button type="button">{props.name} first</button>
      <button type="button">{props.name} last</button>
      {props.children}
    </div>
  );
}

/** A window that puts focus straight into its text field. */
function FieldLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useModalLayer(ref, { initialFocusRef: field });
  return (
    <div ref={ref} tabIndex={-1} data-layer="Form">
      <input ref={field} aria-label="Email" />
    </div>
  );
}

describe("useModalLayer", () => {
  let opener: HTMLButtonElement;
  let lower: HTMLDivElement;
  let upper: HTMLDivElement;

  beforeEach(() => {
    opener = document.createElement("button");
    lower = document.createElement("div");
    upper = document.createElement("div");
    document.body.append(opener, lower, upper);
    opener.focus();
  });

  afterEach(() => {
    act(() => render(null, upper));
    act(() => render(null, lower));
    opener.remove();
    lower.remove();
    upper.remove();
  });

  function press(key: string, shiftKey = false) {
    act(() => {
      (document.activeElement ?? document.body).dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          shiftKey,
          bubbles: true,
          cancelable: true,
        })
      );
    });
  }

  const button = (label: string) =>
    [...document.querySelectorAll("button")].find(
      (element) => element.textContent === label
    )!;
  const open = (root: HTMLElement, node: ComponentChildren) =>
    act(() => render(node, root));
  const close = (root: HTMLElement) => act(() => render(null, root));

  it("gives Escape only to the layer opened last", () => {
    const closeSheet = vi.fn();
    const closeDialog = vi.fn();
    open(lower, <Layer name="Sheet" onEscape={closeSheet} />);
    open(upper, <Layer name="Dialog" onEscape={closeDialog} />);

    press("Escape");

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(closeSheet).not.toHaveBeenCalled();
  });

  it("keeps a panel's own Escape listener from also acting on it", () => {
    const closePanel = vi.fn();
    document.addEventListener("keydown", closePanel);
    const closeDialog = vi.fn();
    open(upper, <Layer name="Dialog" onEscape={closeDialog} />);

    press("Escape");
    document.removeEventListener("keydown", closePanel);

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(closePanel).not.toHaveBeenCalled();
  });

  it("keeps a panel's own Escape listener from also acting on it while nothing has focus", () => {
    // A listener added after the layer opened, like Share's own one was:
    // only the top layer may act on the key.
    const closeDialog = vi.fn();
    open(upper, <Layer name="Dialog" onEscape={closeDialog} />);
    const closePanel = vi.fn();
    document.addEventListener("keydown", closePanel);
    (document.activeElement as HTMLElement).blur();

    press("Escape");
    document.removeEventListener("keydown", closePanel);

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(closePanel).not.toHaveBeenCalled();
  });

  it("leaves alone an Escape that cancels a word being composed", () => {
    const closeDialog = vi.fn();
    open(upper, <Layer name="Dialog" onEscape={closeDialog} />);
    button("Dialog first").focus();

    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          isComposing: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(closeDialog).not.toHaveBeenCalled();
  });

  describe("scrolling what it focuses into view", () => {
    // Whether the browser may scroll is all a test can see: JSDOM has no
    // layout, so the scroll itself only shows in a real browser.
    function recordFocus() {
      const calls: Array<{ element: HTMLElement; preventScroll: boolean }> = [];
      const original = HTMLElement.prototype.focus;
      const spy = vi
        .spyOn(HTMLElement.prototype, "focus")
        .mockImplementation(function (this: HTMLElement, options) {
          calls.push({
            element: this,
            preventScroll: !!options?.preventScroll,
          });
          original.call(this, options);
        });
      return { calls, restore: () => spy.mockRestore() };
    }

    it("lets the browser scroll a text field it focuses into view", () => {
      const focus = recordFocus();
      open(upper, <FieldLayer />);
      focus.restore();

      const field = document.querySelector<HTMLElement>(
        '[aria-label="Email"]'
      )!;
      expect(document.activeElement).toBe(field);
      expect(focus.calls).toEqual([{ element: field, preventScroll: false }]);
    });

    it("doesn't scroll the page when it focuses the window itself", () => {
      const focus = recordFocus();
      open(upper, <Layer name="Dialog" />);
      focus.restore();

      const dialog = document.querySelector<HTMLElement>(
        '[data-layer="Dialog"]'
      )!;
      expect(focus.calls).toEqual([{ element: dialog, preventScroll: true }]);
    });

    it("lets the browser scroll the button that opened it back into view", () => {
      open(upper, <Layer name="Dialog" />);
      const focus = recordFocus();
      close(upper);
      focus.restore();

      expect(document.activeElement).toBe(opener);
      expect(focus.calls).toEqual([{ element: opener, preventScroll: false }]);
    });
  });

  it("wraps Tab inside the top layer", () => {
    open(upper, <Layer name="Dialog" />);
    button("Dialog last").focus();

    press("Tab");
    expect(document.activeElement).toBe(button("Dialog first"));
    press("Tab", true);
    expect(document.activeElement).toBe(button("Dialog last"));
  });

  it("sends Tab from a layer underneath to the top one", () => {
    open(lower, <Layer name="Sheet" />);
    open(upper, <Layer name="Dialog" />);
    button("Sheet first").focus();

    press("Tab");

    expect(document.activeElement).toBe(button("Dialog first"));
  });

  it("gives keys pressed while nothing has focus to the top layer", () => {
    const closeDialog = vi.fn();
    open(upper, <Layer name="Dialog" onEscape={closeDialog} />);
    (document.activeElement as HTMLElement).blur();

    press("Tab");
    expect(document.activeElement).toBe(button("Dialog first"));

    (document.activeElement as HTMLElement).blur();
    press("Escape");
    expect(closeDialog).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the control in the sheet that opened a dialog over it", () => {
    open(lower, <Layer name="Sheet" />);
    button("Sheet last").focus();
    open(upper, <Layer name="Dialog" />);
    expect(upper.contains(document.activeElement)).toBe(true);

    close(upper);

    expect(document.activeElement).toBe(button("Sheet last"));
  });

  // A sheet that closes to show a window (Participants opening a profile)
  // goes before the window does.
  it("returns focus to the sheet's opener when the sheet closed first", () => {
    open(lower, <Layer name="Sheet" />);
    button("Sheet last").focus();
    open(upper, <Layer name="Dialog" />);

    close(lower);
    close(upper);

    expect(document.activeElement).toBe(opener);
  });

  it("stacks a layer that opens with another already inside it underneath", () => {
    const closeSheet = vi.fn();
    const closeViewer = vi.fn();
    open(
      lower,
      <Layer name="Sheet" onEscape={closeSheet}>
        <Layer name="Viewer" onEscape={closeViewer} />
      </Layer>
    );
    const viewer = document.querySelector('[data-layer="Viewer"]')!;
    expect(viewer.contains(document.activeElement)).toBe(true);

    press("Escape");
    expect(closeViewer).toHaveBeenCalledTimes(1);
    expect(closeSheet).not.toHaveBeenCalled();

    open(lower, <Layer name="Sheet" onEscape={closeSheet} />);
    expect(
      document
        .querySelector('[data-layer="Sheet"]')!
        .contains(document.activeElement)
    ).toBe(true);

    close(lower);
    expect(document.activeElement).toBe(opener);
  });

  it("leaves Escape alone once nothing is open", () => {
    const closeDialog = vi.fn();
    const outside = vi.fn();
    open(upper, <Layer name="Dialog" onEscape={closeDialog} />);
    close(upper);
    document.addEventListener("keydown", outside);

    press("Escape");
    document.removeEventListener("keydown", outside);

    expect(closeDialog).not.toHaveBeenCalled();
    expect(outside).toHaveBeenCalledTimes(1);
  });
});
