import { act } from "preact/test-utils";

/**
 * Simulates a mouse press on `down` released over `up`. Like a browser, the
 * `click` goes to the nearest element containing both (`down` and `up` must be
 * the same element or one must contain the other).
 */
export function pressAndRelease(down: HTMLElement, up: HTMLElement) {
  act(() => {
    down.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    up.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    const target = down.contains(up) ? down : up;
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
