import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STATIC_FONT_STYLESHEETS } from "@packages/seed-bible/seed-bible/app/fontStylesheets";
import { withMetricFallback } from "@packages/seed-bible/seed-bible/app/fontFallbacks";
import {
  DEFAULT_SCRIPTURE_WIDTH,
  DEFAULT_VERSE_LINE_HEIGHT,
} from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import {
  DARK_THEME,
  generateThemeCssVariables,
  LIGHT_THEME,
} from "@packages/seed-bible/seed-bible/managers/ThemeManager";

const root = resolve(__dirname, "../../..");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
const baseCss = readFileSync(
  resolve(root, "packages/seed-bible/seed-bible/app/styles/base.inline.css"),
  "utf8"
);
const readerCss = readFileSync(
  resolve(
    root,
    "packages/seed-bible/seed-bible/components/BibleReader/BibleReader.inline.css"
  ),
  "utf8"
);

function earlyConfigScript(): string {
  const script = Array.from(
    indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g),
    (match) => match[1]!
  ).find((body) => body.includes("--sb-early-font-size"));
  if (!script) throw new Error("index.html has no early-config script");
  return script;
}

function runEarlyConfig(config: unknown, search = ""): HTMLElement {
  window.history.replaceState({}, "", `/${search}`);
  localStorage.setItem(
    "sb-profile-config-local",
    typeof config === "string" ? config : JSON.stringify(config)
  );
  new Function(earlyConfigScript())();
  return document.documentElement;
}

describe("index.html early reader config script", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sb-early-config");
    window.history.replaceState({}, "", "/");
  });

  it("applies the saved UI size, font size, width and line height before the app loads", () => {
    const html = runEarlyConfig({
      uiSize: "L",
      fontSize: "XL",
      scriptureWidth: 80,
      textConfig: { verse: { lineHeight: 2.1 } },
    });

    expect(html.style.getPropertyValue("--sb-ui-scale")).toBe("1.15");
    expect(html.style.getPropertyValue("--sb-early-font-size")).toBe("20px");
    expect(html.style.getPropertyValue("--sb-scripture-width")).toBe("80ch");
    expect(html.style.getPropertyValue("--text-verse-line-height")).toBe("2.1");
    expect(html.hasAttribute("data-sb-early-config")).toBe(true);
  });

  it("reads a text config that was stored as a JSON string", () => {
    const html = runEarlyConfig({
      fontSize: "S",
      textConfig: JSON.stringify({ verse: { lineHeight: 1.4 } }),
    });

    expect(html.style.getPropertyValue("--text-verse-line-height")).toBe("1.4");
  });

  it("ignores values the settings parser would reject", () => {
    const html = runEarlyConfig({
      uiSize: "HUGE",
      fontSize: "gigantic",
      scriptureWidth: 5000,
      textConfig: { verse: { lineHeight: "tall" } },
    });

    expect(html.getAttribute("style")).toBeNull();
    expect(html.hasAttribute("data-sb-early-config")).toBe(false);
  });

  it("does nothing for corrupt storage", () => {
    const html = runEarlyConfig("{not json");

    expect(html.getAttribute("style")).toBeNull();
    expect(html.hasAttribute("data-sb-early-config")).toBe(false);
  });

  it("does nothing when nothing is saved", () => {
    window.history.replaceState({}, "", "/");
    new Function(earlyConfigScript())();

    expect(document.documentElement.hasAttribute("data-sb-early-config")).toBe(
      false
    );
  });

  it("steps aside for a link that sets its own app settings", () => {
    const html = runEarlyConfig({ fontSize: "XL" }, "?app.fontSize=S");

    expect(html.hasAttribute("data-sb-early-config")).toBe(false);
    expect(html.style.getPropertyValue("--sb-early-font-size")).toBe("");
  });
});

describe("index.html font loading", () => {
  const linkedHrefs = Array.from(
    indexHtml.matchAll(
      /<link\b[^>]*\bhref="(https:\/\/fonts\.googleapis[^"]+)"/g
    ),
    (match) => match[1]!
  );

  it("links every stylesheet the app and extension frames share", () => {
    for (const href of STATIC_FONT_STYLESHEETS) {
      expect(linkedHrefs).toContain(href);
    }
  });

  it("only loads the preset fonts outside the first paint on demand", () => {
    const firstPaint = STATIC_FONT_STYLESHEETS[0];

    expect(firstPaint).toContain("Newsreader");
    expect(firstPaint).toContain("Plus+Jakarta+Sans");
    expect(firstPaint).not.toContain("Roboto");
    expect(firstPaint).toContain("display=swap");
  });

  it("hides icon names until the icon font is in, without blocking on it", () => {
    expect(indexHtml).toMatch(
      /rel="preload"\s+as="style"[^>]*Material\+Symbols/
    );
    expect(indexHtml).toContain("sb-icons-pending");
    expect(baseCss).toContain(
      "html.sb-icons-pending .material-symbols-outlined"
    );
  });
});

describe("metric-matched fallback fonts", () => {
  it("adds the fallback face before the generic family", () => {
    expect(withMetricFallback("'Plus Jakarta Sans', sans-serif")).toBe(
      `'Plus Jakarta Sans', "Plus Jakarta Sans Fallback", sans-serif`
    );
    expect(withMetricFallback("Newsreader, serif")).toBe(
      `Newsreader, "Newsreader Fallback", serif`
    );
    expect(withMetricFallback("Newsreader")).toBe(
      `Newsreader, "Newsreader Fallback"`
    );
  });

  it("leaves other stacks and already-covered stacks alone", () => {
    expect(withMetricFallback("Roboto, sans-serif")).toBe("Roboto, sans-serif");
    expect(withMetricFallback("inherit")).toBe("inherit");
    expect(withMetricFallback("system-ui, sans-serif")).toBe(
      "system-ui, sans-serif"
    );
    const covered = `"Newsreader", "Newsreader Fallback", serif`;
    expect(withMetricFallback(covered)).toBe(covered);
  });

  it("declares both faces in the critical CSS with the size and line overrides", () => {
    for (const name of ["Plus Jakarta Sans Fallback", "Newsreader Fallback"]) {
      const face = new RegExp(
        `@font-face\\s*{[^}]*font-family:\\s*"${name}"[^}]*size-adjust[^}]*ascent-override[^}]*descent-override`
      );
      expect(baseCss).toMatch(face);
    }
  });

  it("puts the fallback in the first-paint font defaults and theme output", () => {
    expect(baseCss.replace(/\s+/g, " ")).toContain(
      `--text-verse-font: "Plus Jakarta Sans", "Plus Jakarta Sans Fallback", sans-serif;`
    );
    for (const theme of [LIGHT_THEME, DARK_THEME]) {
      const css = generateThemeCssVariables(theme);
      expect(css).toContain(
        `--sb-verse-font-family: Plus Jakarta Sans, "Plus Jakarta Sans Fallback", sans-serif;`
      );
      expect(css).toContain(
        `--sb-book-title-font-family: Newsreader, "Newsreader Fallback", serif;`
      );
    }
  });
});

describe("critical CSS defaults agree with the settings defaults", () => {
  it("starts the scripture at the default width instead of a different fallback", () => {
    expect(baseCss).toContain(
      `--sb-scripture-width: ${DEFAULT_SCRIPTURE_WIDTH}ch;`
    );
    expect(readerCss).not.toContain("48rem");
    expect(readerCss).toContain(
      `var(--sb-scripture-width, ${DEFAULT_SCRIPTURE_WIDTH}ch)`
    );
  });

  it("starts verse line height at the default", () => {
    expect(baseCss).toContain(
      `--text-verse-line-height: ${DEFAULT_VERSE_LINE_HEIGHT};`
    );
  });
});
