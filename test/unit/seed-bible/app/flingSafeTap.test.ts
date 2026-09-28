import { vi, type Mock } from "vitest";
import {
  flingSafeTapHandlers,
  resetFlingSafeTapForTests,
  type FlingSafeTapHandlers,
} from "@packages/seed-bible/seed-bible/app/flingSafeTap";

/** Beyond the helper's tap slop, so a press that moves this far is a drag. */
const DRAG_DISTANCE_PX = 40;

function attach(element: HTMLElement, handlers: FlingSafeTapHandlers) {
  element.addEventListener("pointerdown", handlers.onPointerDown);
  element.addEventListener("pointerup", handlers.onPointerUp);
  element.addEventListener("pointercancel", handlers.onPointerCancel);
  element.addEventListener("click", handlers.onClick);
}

function press(
  element: HTMLElement,
  type: "pointerdown" | "pointerup",
  options: { x?: number; y?: number; pointerType?: string } = {}
) {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: options.pointerType ?? "touch",
      clientX: options.x ?? 10,
      clientY: options.y ?? 10,
    })
  );
}

function simulateMomentumScroll() {
  document.body.dispatchEvent(new Event("scroll", { bubbles: false }));
}

describe("flingSafeTapHandlers", () => {
  let button: HTMLButtonElement;
  let onTap: Mock<() => void>;

  beforeEach(() => {
    button = document.createElement("button");
    document.body.appendChild(button);
    onTap = vi.fn<() => void>();
    attach(button, flingSafeTapHandlers(onTap));
  });

  afterEach(() => {
    button.remove();
    resetFlingSafeTapForTests();
  });

  it("runs the action for a tap the browser withholds the click for", () => {
    // What Chromium does on Android when the tap lands during a momentum
    // scroll: the pointer events arrive, the click never does.
    simulateMomentumScroll();
    press(button, "pointerdown");
    press(button, "pointerup");

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("waits for the click on an ordinary tap, so it does not open UI under the finger", () => {
    press(button, "pointerdown");
    press(button, "pointerup");

    expect(onTap).not.toHaveBeenCalled();

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("runs the action once when a fling-stop tap also gets a click", () => {
    simulateMomentumScroll();
    press(button, "pointerdown");
    press(button, "pointerup");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("ignores a press that travels away from the control", () => {
    simulateMomentumScroll();
    press(button, "pointerdown");
    press(button, "pointerup", { y: 10 + DRAG_DISTANCE_PX });

    expect(onTap).not.toHaveBeenCalled();
  });

  it("ignores a press the browser turns into a scroll", () => {
    simulateMomentumScroll();
    press(button, "pointerdown");
    button.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    press(button, "pointerup");

    expect(onTap).not.toHaveBeenCalled();
  });

  it("still activates on a mouse click", () => {
    press(button, "pointerdown", { pointerType: "mouse" });
    press(button, "pointerup", { pointerType: "mouse" });
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("still activates from the keyboard, which fires no pointer events", () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("activates twice for two taps", () => {
    press(button, "pointerdown");
    press(button, "pointerup");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    press(button, "pointerdown");
    press(button, "pointerup");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onTap).toHaveBeenCalledTimes(2);
  });

  it("does not activate a disabled control", () => {
    button.disabled = true;

    simulateMomentumScroll();
    press(button, "pointerdown");
    press(button, "pointerup");

    expect(onTap).not.toHaveBeenCalled();
  });

  it("keeps a tap on one control from swallowing another control's click", () => {
    const other = document.createElement("button");
    document.body.appendChild(other);
    const onOtherTap = vi.fn<() => void>();
    attach(other, flingSafeTapHandlers(onOtherTap));

    press(button, "pointerdown");
    press(button, "pointerup");
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    other.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        clientX: 200,
        clientY: 200,
      })
    );

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onOtherTap).toHaveBeenCalledTimes(1);
    other.remove();
  });
});
