/**
 * Metric-matched stand-ins for the two web fonts the first paint depends on.
 * `base.inline.css` declares a `Plus Jakarta Sans Fallback` / `Newsreader
 * Fallback` face (a local system font stretched to the web font's width and
 * line metrics), so the text is laid out at nearly the final size while the
 * real font downloads and the swap doesn't reflow the chapter.
 *
 * Stored font settings keep their plain value ("'Plus Jakarta Sans',
 * sans-serif") so saved settings and the font picker keep matching; the
 * fallback is only added where a value is written into CSS.
 */
const FALLBACK_FACES: Record<string, string> = {
  "plus jakarta sans": "Plus Jakarta Sans Fallback",
  newsreader: "Newsreader Fallback",
};

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
      const fallback = FALLBACK_FACES[name.trim().toLowerCase()];
      if (!fallback || fontStack.includes(fallback)) return whole;
      return `${head}, "${fallback}"${tail}`;
    }
  );
}
