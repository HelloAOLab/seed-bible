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

/**
 * Where the reader's text can actually be seen, in viewport pixels: inside
 * `scroller` (or the window, when the page itself scrolls), below the mobile
 * header floating over its top, and above the toolbar over its bottom. Text
 * under either isn't really on screen.
 *
 * `within` is any element inside the reader, used to find that reader's
 * header.
 */
export function measureVisibleReaderBounds(
  within: HTMLElement,
  scroller: HTMLElement | null
): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  if (scroller) {
    const rect = scroller.getBoundingClientRect();
    top = rect.top;
    bottom = rect.bottom;
  }
  const header = within
    .closest(".sb-bible-reader")
    ?.querySelector(".sb-bible-reader-mobile-header");
  if (header) {
    top = Math.max(top, header.getBoundingClientRect().bottom);
  }
  return { top, bottom: bottom - readBottomChromeInset() };
}

/** Breathing room left above a verse scrolled to the top of the reader. */
const READ_ALONG_TOP_GAP_PX = 16;

/**
 * Glides `verse` to the top of the visible reader, unless it is already
 * entirely on screen — so a listener following the narration never has to
 * scroll, and a reader who can already see the verse isn't moved at all.
 */
export function revealReadAlongVerse(
  verse: HTMLElement,
  scroller: HTMLElement | null
): void {
  const { top, bottom } = measureVisibleReaderBounds(verse, scroller);
  const rect = verse.getBoundingClientRect();
  if (rect.top >= top && rect.bottom <= bottom) return;

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  (scroller ?? window).scrollBy({
    top: rect.top - top - READ_ALONG_TOP_GAP_PX,
    behavior: reduceMotion ? "auto" : "smooth",
  });
}
