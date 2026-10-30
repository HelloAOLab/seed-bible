/**
 * Turns the SSR template `index.html` into a static page the native (Capacitor)
 * apps can load straight from disk.
 *
 * On the web, the host server fills every `<!-- PLACEHOLDER -->` in the
 * template per request (see `standalone/entry-ssr.tsx`). Inside the native apps
 * there is no server, so the bundled page is the only page — this fills those
 * same placeholders once, at build time, with the values a fresh install
 * should start from. The client then renders from scratch rather than
 * hydrating, the same path it takes when an SSR document can't be trusted.
 */

export interface NativeShellValues {
  /** Composed CSS for the theme the page paints with before the app loads. */
  themeStyleText: string;
  /** The built-in theme presets, keyed by theme id (see `THEME_PRESET_STYLE_TEXT`). */
  themePresetStyleText: Record<string, string>;
}

/** Same escaping `entry-ssr.tsx` applies to JSON spliced into a `<script>`. */
const escapeForScript = (json: string): string => json.replace(/</g, "\\u003c");

/**
 * Matches a server placeholder: `<!-- NAME -->`, upper case and underscores.
 * Ordinary HTML comments in the template are prose, so they never match.
 */
const PLACEHOLDER_RE = /<!--\s*([A-Z][A-Z0-9_]*)\s*-->/g;

export function fillNativeShellPlaceholders(
  html: string,
  values: NativeShellValues
): string {
  const substitutions: Record<string, string> = {
    HTML_LANG: "en",
    META: "",
    THEME_STYLE_TAG: values.themeStyleText,
    THEME_PRESETS_JSON: escapeForScript(
      JSON.stringify(values.themePresetStyleText)
    ),
    // Seeds the first render's viewport guess (see `renderedAsMobile` in
    // `SeedBibleStateManager.tsx`) until the real size is measured. Most
    // installs are phones.
    CONFIG_JSON: escapeForScript(JSON.stringify({ renderedAsMobile: true })),
    SEED_JSON: "{}",
    CUSTOMIZATION_JSON: "null",
    PLAYLIST_PAGE_JSON: "null",
    READING_PLAN_PAGE_JSON: "null",
    APP_HTML: "",
  };
  return html.replace(
    PLACEHOLDER_RE,
    (match, name: string) => substitutions[name] ?? match
  );
}

/** Names of any server placeholders still left in `html`. */
export function findUnfilledPlaceholders(html: string): string[] {
  return [...html.matchAll(PLACEHOLDER_RE)].map(
    ([match, name]) => name ?? match
  );
}
