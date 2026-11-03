/**
 * Metric-matched stand-ins for the two web fonts the first paint depends on.
 * `base.inline.css` declares faces such as `Plus Jakarta Sans Fallback` (a
 * local system font stretched to the web font's width and line metrics), so
 * the text is laid out at nearly the final size while the real font
 * downloads and the swap doesn't reflow the chapter.
 *
 * Stored font settings keep their plain value ("'Plus Jakarta Sans',
 * sans-serif") so saved settings and the font picker keep matching; the
 * fallback is only added where a value is written into CSS.
 */
/**
 * One stand-in per (web font, base system font). Every number was measured,
 * not recalled, on 2026-11 in Chromium (Playwright, iPhone 12 Pro emulation):
 *
 * - `sizeAdjust` is real width / base width of the same text, rendered as
 *   single unwrapped spans at 16px: whole chapters (John 3, Genesis 1,
 *   Romans 8, Psalm 119; English and Spanish) for Plus Jakarta Sans at weight
 *   500 (what verse text uses), and 66 book names plus chapter headings for
 *   Newsreader at 400/700 and 20/32px. Averages: PJS/Arial-metrics 1.052
 *   (range 1.049-1.062), PJS/Roboto 1.061, Newsreader/Times-metrics 1.05,
 *   Newsreader/Noto Serif 0.90. Spaces are much narrower in the web font
 *   (0.17em vs Arial's 0.28em), so no single factor lines up every line;
 *   the best one gave about 3% of lines a different break on a chapter
 *   instead of ~40% with the earlier guessed 108.5%.
 * - `ascent`/`descent` are the web font's hhea values (PJS 1.038/0.222, upm
 *   1000; Newsreader 0.735/0.265, upm 2000) divided by `sizeAdjust`, because
 *   Chromium scales the overrides by size-adjust. Line gap is 0 for both.
 *   Chromium rounds ascent and descent to whole pixels; at 16px the fallback
 *   then gives the same 17+4 / 12+4 px content area as the real font.
 * - The Arial entries match `local()` names for metric-compatible fonts only
 *   (Arial, Arimo, Liberation Sans; Helvetica on Apple devices). The test
 *   Chromium has no font named "Arial", so it used Liberation Sans: the same
 *   widths as Arial by design. Android has none of those names, so it takes
 *   the Roboto / Noto Serif entries; devices whose system font is neither
 *   (some OEM skins, Roboto Flex) fall through to the plain generic family
 *   and still reflow on swap. Not verified on real Android hardware.
 *
 * `base.inline.css` repeats these as @font-face rules (it is inlined as-is,
 * so it cannot import this); a test keeps the two in step.
 */
export const FALLBACK_FACES = [
  {
    family: "Plus Jakarta Sans Fallback",
    web: "plus jakarta sans",
    local: ["Arial", "Arimo", "Liberation Sans", "Helvetica"],
    sizeAdjust: 105.2,
    ascent: 98.7,
    descent: 21.1,
  },
  {
    family: "Plus Jakarta Sans Fallback Roboto",
    web: "plus jakarta sans",
    local: ["Roboto", "Roboto-Regular"],
    sizeAdjust: 106.1,
    ascent: 97.8,
    descent: 20.9,
  },
  {
    family: "Newsreader Fallback",
    web: "newsreader",
    local: ["Times New Roman", "Liberation Serif", "Tinos", "Times"],
    sizeAdjust: 105,
    ascent: 70,
    descent: 25.2,
  },
  {
    family: "Newsreader Fallback Noto Serif",
    web: "newsreader",
    local: ["Noto Serif"],
    sizeAdjust: 90,
    ascent: 81.7,
    descent: 29.4,
  },
] as const;

const FIRST_FAMILY_RE = /^(\s*(["']?)([^,"']+?)\2)\s*(,|$)/;

/**
 * Inserts the matching fallback face right after the stack's first family
 * when that family is one we have metrics for. It must sit before the generic
 * keyword (`sans-serif`), which always matches and ends the search.
 */
export function withMetricFallback(fontStack: string): string {
  return fontStack.replace(
    FIRST_FAMILY_RE,
    (whole, head: string, _quote: string, name: string, tail: string) => {
      const faces = FALLBACK_FACES.filter(
        (face) => face.web === name.trim().toLowerCase()
      );
      const first = faces[0];
      if (!first || fontStack.includes(first.family)) {
        return whole;
      }
      const names = faces.map((face) => `"${face.family}"`).join(", ");
      return `${head}, ${names}${tail}`;
    }
  );
}
