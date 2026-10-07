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

/** The part of the chapter content box that is on screen, in content px. */
export interface ReaderViewport {
  top: number;
  bottom: number;
}

/**
 * Where the screen is over the chapter content, in the content's own
 * coordinates. Accounts for the mobile header floating over the top of the
 * scroller and the toolbar over its bottom, since verses under either are not
 * really on screen.
 */
export function measureReaderViewport(
  content: HTMLElement,
  scroller: HTMLElement | null
): ReaderViewport {
  const contentRect = content.getBoundingClientRect();
  let top = 0;
  let bottom = window.innerHeight;
  if (scroller) {
    const rect = scroller.getBoundingClientRect();
    top = rect.top;
    bottom = rect.bottom;
  }
  const header = content
    .closest(".sb-bible-reader")
    ?.querySelector(".sb-bible-reader-mobile-header");
  if (header) {
    top = Math.max(top, header.getBoundingClientRect().bottom);
  }
  bottom -= readBottomChromeInset();
  return { top: top - contentRect.top, bottom: bottom - contentRect.top };
}
