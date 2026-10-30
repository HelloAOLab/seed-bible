import type { Plugin } from "vite";
import {
  composeThemeStyleText,
  LIGHT_THEME,
  THEME_PRESET_STYLE_TEXT,
} from "../../packages/seed-bible/seed-bible/managers/ThemeManager";
import {
  fillNativeShellPlaceholders,
  findUnfilledPlaceholders,
} from "./nativeShell";

/**
 * Fills `index.html`'s server placeholders at build time for the native app
 * build (`vite build --mode native`). See `./nativeShell.ts`.
 *
 * Two plugins rather than one: the fill runs as a `post` HTML transform, but
 * the check that nothing was missed has to wait until every other plugin's
 * HTML transform has run too (`vite-plugin-inline-critical-css` fills one of
 * the placeholders itself), which only `generateBundle` guarantees.
 */
export function nativeShellPlugin(): Plugin[] {
  return [
    {
      name: "vite-plugin-native-shell:fill",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler: (html) =>
          fillNativeShellPlaceholders(html, {
            themeStyleText: composeThemeStyleText(LIGHT_THEME),
            themePresetStyleText: THEME_PRESET_STYLE_TEXT,
          }),
      },
    },
    {
      name: "vite-plugin-native-shell:verify",
      apply: "build",
      enforce: "post",
      generateBundle(_options, bundle) {
        const page = bundle["index.html"];
        if (page?.type !== "asset") return;
        const unfilled = findUnfilledPlaceholders(String(page.source));
        // An unfilled placeholder ships as literal text — inside a JSON
        // `<script>` it fails to parse, and nothing else will flag it.
        if (unfilled.length > 0) {
          this.error(
            `index.html still has server placeholders the native build doesn't fill: ${unfilled.join(", ")}. Add them to script/lib/nativeShell.ts.`
          );
        }
      },
    },
  ];
}
