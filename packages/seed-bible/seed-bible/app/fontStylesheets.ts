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
  ICON_FONT_STYLESHEET,
] as const;

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
