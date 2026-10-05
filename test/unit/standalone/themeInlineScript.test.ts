import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DARK_THEME,
  LIGHT_THEME,
  THEME_PRESET_STYLE_TEXT,
} from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { stubColorScheme } from "../seed-bible/testUtils/stubColorScheme";

/**
 * The pre-hydration theme script from the real `index.html`, found by the
 * `sb-profile-config-local` read it performs, so this runs exactly what ships.
 */
function readInlineThemeScript(): string {
  const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
  const script = Array.from(
    html.matchAll(/<script>([\s\S]*?)<\/script>/g),
    (match) => match[1]!
  ).find((body) => body.includes("sb-profile-config-local"));
  if (!script) {
    throw new Error("index.html has no inline theme script");
  }
  return script;
}

/** The server-rendered head as the script sees it: Light, whatever the device. */
function installServerRenderedHead(): void {
  document.head.innerHTML = [
    `<meta name="theme-color" id="sb-theme-color" content="${LIGHT_THEME.variables.background}" />`,
    `<style id="sb-theme-styles">${THEME_PRESET_STYLE_TEXT.light}</style>`,
    `<script type="application/json" id="sb-theme-presets">${JSON.stringify(
      THEME_PRESET_STYLE_TEXT
    )}</script>`,
  ].join("");
}

function runInlineThemeScript(): void {
  new Function(readInlineThemeScript())();
}

function paintedBackground(): string | null | undefined {
  return document.getElementById("sb-theme-color")?.getAttribute("content");
}

describe("index.html pre-hydration theme script", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.head.innerHTML = "";
  });

  it("paints Dark for a first-time visitor on a dark device, since System is the default", () => {
    installServerRenderedHead();
    stubColorScheme(true);

    runInlineThemeScript();

    expect(document.getElementById("sb-theme-styles")?.textContent).toContain(
      `--sb-background: ${DARK_THEME.variables.background};`
    );
    expect(paintedBackground()).toBe(DARK_THEME.variables.background);
  });

  it("paints Dark for a saved config with no theme on a dark device", () => {
    installServerRenderedHead();
    stubColorScheme(true);
    localStorage.setItem(
      "sb-profile-config-local",
      JSON.stringify({ fontSize: 18 })
    );

    runInlineThemeScript();

    expect(paintedBackground()).toBe(DARK_THEME.variables.background);
  });

  it("keeps Light for a first-time visitor on a light device", () => {
    installServerRenderedHead();
    stubColorScheme(false);

    runInlineThemeScript();

    expect(paintedBackground()).toBe(LIGHT_THEME.variables.background);
  });

  it("keeps a saved Light on a dark device", () => {
    installServerRenderedHead();
    stubColorScheme(true);
    localStorage.setItem(
      "sb-profile-config-local",
      JSON.stringify({ themeId: "light" })
    );

    runInlineThemeScript();

    expect(paintedBackground()).toBe(LIGHT_THEME.variables.background);
  });

  it("keeps the server's theme when the saved config is corrupt", () => {
    installServerRenderedHead();
    stubColorScheme(true);
    localStorage.setItem("sb-profile-config-local", "{not json");

    expect(runInlineThemeScript).not.toThrow();
    expect(paintedBackground()).toBe(LIGHT_THEME.variables.background);
  });
});
