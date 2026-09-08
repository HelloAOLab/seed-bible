/**
 * Baking the CSS captured from `*.inline.css` modules directly into
 * `index.html`, and making the remaining external stylesheet non-blocking.
 *
 * First paint currently waits on the full external stylesheet for a specific
 * reason: `index.html` ships an inline `html { visibility: hidden }` rule,
 * and the only thing that overrides it back to visible is a rule inside
 * `base.css`. Once that file's content (plus BibleReader/BibleReaderToolbar's)
 * is inlined instead, the reveal fires as soon as the HTML parses, and the
 * remaining stylesheet no longer needs to block the parser at all.
 *
 * Pure string functions so `test/unit/script/lib/inlineCriticalCss.test.ts`
 * can pin them down without running a build.
 */

/** Placeholder in `index.html`'s `<style id="sb-critical-styles">` tag. */
export const CRITICAL_STYLE_PLACEHOLDER = "<!-- CRITICAL_STYLE_TAG -->";

const LINK_TAG_RE = /<link\b[^>]*>/gi;
const CSS_FILE_ID_RE = /\.css$/;

/**
 * True for a module id Vite's normal CSS pipeline would bundle into the
 * external stylesheet (i.e. any `.css` file, ignoring a `?...` query
 * suffix). `*.inline.css` files never reach this check with their real id —
 * `vite-plugin-inline-critical-css.ts`'s `resolveId` hook rewrites them to a
 * virtual id with no `.css` suffix before this runs.
 *
 * Used to power `VITE_CRITICAL_CSS_ONLY=true`, which blanks out every match
 * so a build can be inspected with *only* the critical CSS applied — the
 * fastest way to see whether the critical set is actually sufficient for a
 * correct first paint.
 */
export function isNonCriticalStylesheetId(id: string): boolean {
  return CSS_FILE_ID_RE.test(id.replace(/\?.*$/, ""));
}

function readAttr(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`,
    "i"
  ).exec(tag);
  if (!match) return null;
  return match[2] ?? match[3] ?? null;
}

/**
 * Replaces the critical-style placeholder with the real compiled CSS.
 * A no-op if the placeholder isn't present (e.g. a template that doesn't use
 * this mechanism).
 */
export function injectCriticalStyles(
  html: string,
  criticalCss: string
): string {
  if (!html.includes(CRITICAL_STYLE_PLACEHOLDER)) return html;

  // A literal `</style>` inside the CSS would terminate the tag early and
  // leak the rest of the CSS as visible page text. None of the hand-written
  // source files have one — fail loudly if that ever changes rather than
  // silently shipping broken markup.
  if (criticalCss.includes("</style")) {
    throw new Error(
      "Critical CSS contains a literal `</style>` sequence and can't be inlined safely."
    );
  }

  return html.replace(CRITICAL_STYLE_PLACEHOLDER, () => criticalCss);
}

/**
 * Rewrites every `<link rel="stylesheet">` into the standard preload-swap
 * pattern (`rel="preload" as="style" onload="...rel='stylesheet'"`) plus a
 * `<noscript>` fallback, so the stylesheet loads in parallel instead of
 * blocking the parser. Tags with another `rel` (icon, preconnect, manifest,
 * the meta-asset carriers, ...) are left untouched.
 */
export function makeStylesheetsNonBlocking(html: string): string {
  return html.replace(LINK_TAG_RE, (tag) => {
    if (readAttr(tag, "rel")?.toLowerCase() !== "stylesheet") return tag;

    const href = readAttr(tag, "href");
    if (!href) return tag;

    const crossorigin = /\bcrossorigin\b/i.test(tag) ? " crossorigin" : "";
    const preload = `<link rel="preload" as="style"${crossorigin} href="${href}" onload="this.onload=null;this.rel='stylesheet'">`;
    const fallback = `<noscript><link rel="stylesheet"${crossorigin} href="${href}"></noscript>`;
    return `${preload}\n${fallback}`;
  });
}
