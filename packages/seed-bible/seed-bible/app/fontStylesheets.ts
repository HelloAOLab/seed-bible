/** The Material Symbols icon font. */
export const ICON_FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0";

/**
 * The Google Fonts stylesheets the app loads: the preset font families and
 * the Material Symbols icon font. Shared by the app's own `<head>`
 * (`<link>` tags in `index.html`, which a test keeps in step with this list)
 * and the frames sandboxed
 * extensions run in, so both render with the same fonts.
 */
export const STATIC_FONT_STYLESHEETS = [
  // The two families the first paint is set in.
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap",
  // Only reached when someone picks one of these in the font settings.
  "https://fonts.googleapis.com/css2?family=Roboto&family=Open+Sans&family=Playfair+Display&family=Cormorant+Garamond&display=swap",
  // The playlist editor's; their files are only fetched once it's open.
  "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&family=Figtree:wght@400;500;600;700&family=Literata&display=swap",
  ICON_FONT_STYLESHEET,
] as const;

/** CSS keywords for fonts the device already has; Google Fonts has none of them. */
const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "math",
  "emoji",
  "fangsong",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "inherit",
  "initial",
  "unset",
  "revert",
]);

const STATICALLY_LOADED_FAMILIES = new Set(
  STATIC_FONT_STYLESHEETS.flatMap((url) =>
    new URL(url).searchParams
      .getAll("family")
      .map((family) => family.split(":")[0]!.toLowerCase())
  )
);

/**
 * The font families named first in `fontStacks` that need a stylesheet of
 * their own: not a system font keyword (`system-ui`, `serif`, ...) and not
 * already in `STATIC_FONT_STYLESHEETS`. Each stack's first family is the one
 * the theme asks for; the rest are fallbacks.
 */
export function familiesNeedingCustomFontStylesheet(
  fontStacks: readonly (string | null | undefined)[]
): string[] {
  const names = new Set<string>();
  for (const stack of fontStacks) {
    const name = stack
      ?.split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "")
      .trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (GENERIC_FONT_FAMILIES.has(key) || STATICALLY_LOADED_FAMILIES.has(key)) {
      continue;
    }
    names.add(name);
  }
  return [...names];
}

/**
 * The stylesheet for font families a customization names that aren't in
 * the presets, or null when there are none. The names are already limited to
 * safe characters (see `CustomizationsManager.buildCustomFontValue`).
 */
export function customFontStylesheet(
  families: readonly string[]
): string | null {
  if (families.length === 0) {
    return null;
  }
  return `https://fonts.googleapis.com/css2?${families
    .map((name) => `family=${name.replace(/ /g, "+")}`)
    .join("&")}&display=swap`;
}

/** The hosts those stylesheets, and the font files they point at, come from. */
export const FONT_STYLESHEET_HOST = "fonts.googleapis.com";
export const FONT_FILE_HOST = "fonts.gstatic.com";
