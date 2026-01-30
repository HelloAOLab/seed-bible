import { getThemeObject, getPreferedColorScheme } from "app.main.themeUtils";

function generateCSSVarsFromObjectEntries(obj: Record<string, any>) {
  return Object.entries(obj).map(([key, value]) => `--${key}: ${value};`);
}

/**
 * Helper to generate CSS variables from settings
 * TODO: This should likely see a refactor which traverses the object once rather than twice fully + a third time over filtered items.
 */
function generateFontVars(
  settings: Record<string, unknown>,
  prefix: string,
  keyMap: Record<string, string>
) {
  return Object.entries(keyMap)
    .filter(([key]) => settings[key])
    .map(([key, cssName]) => {
      const value = settings[key];
      const isFont = key.toLowerCase().includes("font");
      return isFont
        ? `--${prefix}-${cssName}: '${value}', sans-serif;`
        : `--${prefix}-${cssName}: ${value}px;`;
    });
}

// ! There is a bug in casualOS related to ...args: type declarations. (assigning types to spread args).
// function combineFontVars(
//     ...args: Array<{
//         settings: Record<string, unknown>,
//         prefix: string,
//         keyMap: Record<string, string>
//     }>
// )
function combineFontVars(
  args: Array<{
    settings: Record<string, unknown>;
    prefix: string;
    keyMap: Record<string, string>;
  }>
) {
  const fontVars = [];
  for (const params of args) {
    fontVars.push(
      ...generateFontVars(params.settings, params.prefix, params.keyMap)
    );
  }
  return fontVars;
}

/**
 * This is very niched, it needs to be re-evaluated.
 */
function refactorme_getNicheFontVars(
  scriptureSettings: Record<string, any>,
  sideMenuSettings: Record<string, any>,
  inputFieldsSettings: Record<string, any>
) {
  return combineFontVars([
    {
      settings: scriptureSettings,
      prefix: "scripture",
      keyMap: {
        bookHeadingFont: "bookHeading-font",
        bookHeadingSize: "bookHeading-size",
        chapterHeadingFont: "chapterHeading-font",
        chapterHeadingSize: "chapterHeading-size",
        verseTextFont: "verseText-font",
        verseTextSize: "verseText-size",
        verseNumberFont: "verseNumber-font",
        verseNumberSize: "verseNumber-size",
      },
    },
    {
      settings: sideMenuSettings,
      prefix: "sideMenu",
      keyMap: {
        spaceNameFont: "spaceName-font",
        spaceNameSize: "spaceName-size",
        menuTextFont: "menuText-font",
        menuTextSize: "menuText-size",
        heading1Font: "heading1-font",
        heading1Size: "heading1-size",
        heading2Font: "heading2-font",
        heading2Size: "heading2-size",
        heading3Font: "heading3-font",
        heading3Size: "heading3-size",
        descriptionTextFont: "description-font",
        descriptionTextSize: "description-size",
        breadcrumbsFont: "breadcrumbs-font",
        breadcrumbsSize: "breadcrumbs-size",
        iconsSize: "icons-size",
      },
    },
    {
      settings: inputFieldsSettings,
      prefix: "input",
      keyMap: {
        titleFont: "title-font",
        titleSize: "title-size",
        placeholderFont: "placeholder-font",
        placeholderSize: "placeholder-size",
      },
    },
  ]);
}

function formatVarsInRootCSS(vars: Array<string>) {
  return `:root {\n  ${vars.join("\n  ")}\n}`;
}

function getAllVars(
  existingVars: Array<string>,
  currentSpace: Record<string, any> | null
) {
  return currentSpace
    ? [
        ...existingVars,
        ...refactorme_getNicheFontVars(
          currentSpace?.scriptureSettings || {},
          currentSpace?.sideMenuSettings || {},
          currentSpace?.inputFieldsSettings || {}
        ),
      ]
    : existingVars;
}

/**
 * We need to change how the theme is gathered, a proper store will likely need to be set up.
 * TODO: Setup store and refactor.
 */
function getThemeCSSColors(themeColorOverride: Record<string, any> | null) {
  const theme = getThemeObject(getPreferedColorScheme());

  return themeColorOverride === null
    ? theme
    : {
        ...theme, // start with defaults
        ...themeColorOverride, // overwrite with current themeColors
      };
}

export function calcThemeCSS(
  themeColorOverride: Record<string, any> | null,
  currentSpace: Record<string, any> | null
) {
  return formatVarsInRootCSS(
    getAllVars(
      generateCSSVarsFromObjectEntries(getThemeCSSColors(themeColorOverride)),
      currentSpace
    )
  );
}
