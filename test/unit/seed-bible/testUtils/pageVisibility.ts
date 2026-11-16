/**
 * Stands in for `document.visibilityState`, which jsdom won't let a test set,
 * so a test can hide the page and bring it back the way switching tabs, or
 * leaving and returning to the app on a phone, does.
 */
export function stubPageVisibility(
  initial: DocumentVisibilityState = "visible"
) {
  let visibilityState = initial;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibilityState,
  });
  return {
    /** Changes the page's visibility and fires `visibilitychange`, as the browser does. */
    set(next: DocumentVisibilityState) {
      visibilityState = next;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    /** Hides the page, then shows it again: leaving the app and coming back. */
    leaveAndReturn() {
      this.set("hidden");
      this.set("visible");
    },
    restore() {
      Reflect.deleteProperty(document, "visibilityState");
    },
  };
}
