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

/** The phone header floating over the top of the reader `within` sits in. */
function findMobileHeader(within: HTMLElement): Element | null {
  return (
    within
      .closest(".sb-bible-reader")
      ?.querySelector(".sb-bible-reader-mobile-header") ?? null
  );
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
  const header = findMobileHeader(within);
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
 *
 * A heading directly above the verse counts as part of it, so a listener
 * jumping to the start of a section sees the section's title too. The
 * chapter's first verse goes to the very top instead, so the chapter's own
 * title shows above it rather than being left just off screen.
 */
export function revealReadAlongVerse(
  verse: HTMLElement,
  scroller: HTMLElement | null
): void {
  const { top, bottom } = measureVisibleReaderBounds(verse, scroller);
  const rect = {
    top: (headingAbove(verse) ?? verse).getBoundingClientRect().top,
    bottom: verse.getBoundingClientRect().bottom,
  };
  if (rect.top >= top && rect.bottom <= bottom) return;

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";
  const target = scroller ?? window;

  const isFirstVerse =
    verse
      .closest(".sb-chapter-content")
      ?.querySelector(".sb-verse[data-verse-number]") === verse;
  if (isFirstVerse) {
    target.scrollTo({ top: 0, behavior });
    return;
  }

  let landingTop = top;
  if (rect.top < top) {
    landingTop = Math.max(
      landingTop,
      headerTopAfterScrollingUp(verse, scroller)
    );
  }
  target.scrollBy({
    top: rect.top - landingTop - READ_ALONG_TOP_GAP_PX,
    behavior,
  });
}

/**
 * The topmost of the headings directly above `verse` (a section can carry
 * more than one), or null when the verse doesn't start a section.
 *
 * A highlighted verse sits inside a `display: contents` wrapper, so when the
 * verse opens its wrapper the search continues from the wrapper instead.
 */
function headingAbove(verse: HTMLElement): HTMLElement | null {
  let node: Element = verse;
  while (
    !node.previousElementSibling &&
    node.parentElement &&
    !node.parentElement.classList.contains("sb-chapter-content")
  ) {
    node = node.parentElement;
  }

  let heading: HTMLElement | null = null;
  for (
    let sibling = node.previousElementSibling;
    sibling instanceof HTMLElement &&
    sibling.classList.contains("sb-chapter-heading");
    sibling = sibling.previousElementSibling
  ) {
    heading = sibling;
  }
  return heading;
}

/**
 * Where the visible reader will start once a scroll *up* finishes.
 *
 * The phone header hides while the reader scrolls down and comes back as soon
 * as it scrolls up, so measuring it now — often hidden, with no height at all
 * — would land the verse right where the header is about to reappear. The
 * scroller keeps room for the header as its top padding, which holds whether
 * the header is showing or not.
 */
function headerTopAfterScrollingUp(
  within: HTMLElement,
  scroller: HTMLElement | null
): number {
  const header = findMobileHeader(within);
  if (!header || !scroller) return 0;
  const reserved = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
  return Math.max(
    header.getBoundingClientRect().bottom,
    scroller.getBoundingClientRect().top + reserved
  );
}
