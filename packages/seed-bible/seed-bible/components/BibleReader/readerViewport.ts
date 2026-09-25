/** The nearest ancestor that scrolls, or null when the page itself does. */
export function findScrollContainer(element: HTMLElement): HTMLElement | null {
  for (
    let node = element.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
  }
  return null;
}

/**
 * How much of the bottom of the reader the fixed bottom chrome covers, read
 * from the variable BibleReaderToolbar keeps up to date. Written in px at
 * runtime; the stylesheet fallback is in rem.
 */
export function readBottomChromeInset(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--sb-reader-bottom-inset")
    .trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  if (raw.endsWith("rem")) {
    return (
      value * parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
  }
  return raw.endsWith("px") ? value : 0;
}
