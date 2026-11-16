type BodyMetric =
  | "scrollWidth"
  | "clientWidth"
  | "scrollHeight"
  | "clientHeight";

/**
 * jsdom does no layout: every element reports 0 for its sizes, so the
 * collapsed text never looks clipped and "Read more" would never appear.
 * These fakes stand in for the browser's measurement of the collapsed body,
 * which is what the component compares — widths for a single line, heights
 * for a multi-line clamp.
 *
 * They can only check that the component reacts correctly to a given
 * measurement. Whether the CSS actually clips the line — and so whether the
 * real measurement is the one we think it is — is not observable here, and
 * needs a browser.
 */
export function mockBodyMetrics(options: Partial<Record<BodyMetric, number>>) {
  const names = Object.keys(options) as BodyMetric[];
  const isBody = (el: HTMLElement) =>
    el.classList.contains("sb-expandable-text-body");
  const originals = names.map(
    (name) =>
      [
        name,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
      ] as const
  );

  for (const name of names) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get(this: HTMLElement) {
        return isBody(this) ? options[name] : 0;
      },
    });
  }

  return () => {
    for (const [name, descriptor] of originals) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, name, descriptor);
      }
    }
  };
}
