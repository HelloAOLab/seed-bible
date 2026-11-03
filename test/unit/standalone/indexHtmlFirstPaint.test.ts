import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STATIC_FONT_STYLESHEETS } from "@packages/seed-bible/seed-bible/app/fontStylesheets";
import {
  FALLBACK_FACES,
  withMetricFallback,
} from "@packages/seed-bible/seed-bible/app/fontFallbacks";
import {
  MAX_LOCAL_CONFIG_JSON_LENGTH,
  MAX_LOCAL_CONFIG_KEYS,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  DEFAULT_SCRIPTURE_WIDTH,
  DEFAULT_VERSE_LINE_HEIGHT,
  MAX_SCRIPTURE_WIDTH,
  MIN_SCRIPTURE_WIDTH,
  READER_SETTINGS_MIRROR_KEY,
  UI_SIZE_SCALE_MAP,
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

describe("index.html early config script: what gets marked as applied", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sb-early-config");
    window.history.replaceState({}, "", "/");
  });

  it("marks the page when only the scripture width was saved", () => {
    const html = runEarlyConfig({ scriptureWidth: 90 });

    expect(html.style.getPropertyValue("--sb-scripture-width")).toBe("90ch");
    expect(html.hasAttribute("data-sb-early-config")).toBe(true);
  });

  it("marks the page when only the UI size was saved", () => {
    const html = runEarlyConfig({ uiSize: "XL" });

    expect(html.style.getPropertyValue("--sb-ui-scale")).toBe("1.3");
    expect(html.hasAttribute("data-sb-early-config")).toBe(true);
  });

  it("keeps earlier values, and the mark, when the text config is corrupt", () => {
    const html = runEarlyConfig({
      uiSize: "L",
      scriptureWidth: 70,
      textConfig: "{not json",
    });

    expect(html.style.getPropertyValue("--sb-ui-scale")).toBe("1.15");
    expect(html.style.getPropertyValue("--sb-scripture-width")).toBe("70ch");
    expect(html.hasAttribute("data-sb-early-config")).toBe(true);
  });
});

describe("index.html early config script: signed-in readers", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sb-early-config");
  });

  it("paints from the settings copy even though the local config is empty", () => {
    localStorage.setItem("sb-profile-config-local", "{}");
    localStorage.setItem(
      READER_SETTINGS_MIRROR_KEY,
      JSON.stringify({
        uiSize: "L",
        fontSize: "XXL",
        scriptureWidth: 100,
        verseLineHeight: 2,
      })
    );
    new Function(earlyConfigScript())();

    const style = document.documentElement.style;
    expect(style.getPropertyValue("--sb-ui-scale")).toBe("1.15");
    expect(style.getPropertyValue("--sb-early-font-size")).toBe("22px");
    expect(style.getPropertyValue("--sb-scripture-width")).toBe("100ch");
    expect(style.getPropertyValue("--text-verse-line-height")).toBe("2");
  });

  it("prefers the settings copy over the anonymous local config", () => {
    localStorage.setItem(
      "sb-profile-config-local",
      JSON.stringify({ uiSize: "S" })
    );
    localStorage.setItem(
      READER_SETTINGS_MIRROR_KEY,
      JSON.stringify({ uiSize: "XL" })
    );
    new Function(earlyConfigScript())();

    expect(
      document.documentElement.style.getPropertyValue("--sb-ui-scale")
    ).toBe("1.3");
  });
});

describe("index.html early config script: signed-in reader's cached profile", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sb-early-config");
  });

  it("paints from the cached profile when the settings copy does not exist yet", () => {
    localStorage.setItem(
      "sb-profile-cache-user-1",
      JSON.stringify({
        name: "Test",
        config: { scriptureWidth: 40, uiSize: "L", fontSize: "XL" },
      })
    );
    new Function(earlyConfigScript())();

    const html = document.documentElement;
    expect(html.style.getPropertyValue("--sb-scripture-width")).toBe("40ch");
    expect(html.style.getPropertyValue("--sb-ui-scale")).toBe("1.15");
    expect(html.hasAttribute("data-sb-early-config")).toBe(true);
  });

  it("prefers the cached profile over the anonymous local config", () => {
    localStorage.setItem(
      "sb-profile-config-local",
      JSON.stringify({ scriptureWidth: 100 })
    );
    localStorage.setItem(
      "sb-profile-cache-user-1",
      JSON.stringify({ name: "Test", config: { scriptureWidth: 40 } })
    );
    new Function(earlyConfigScript())();

    expect(
      document.documentElement.style.getPropertyValue("--sb-scripture-width")
    ).toBe("40ch");
  });

  it("skips a cached profile that has no config and falls back to the local config", () => {
    localStorage.setItem(
      "sb-profile-cache-user-1",
      JSON.stringify({ name: "T" })
    );
    localStorage.setItem(
      "sb-profile-config-local",
      JSON.stringify({ scriptureWidth: 50 })
    );
    new Function(earlyConfigScript())();

    expect(
      document.documentElement.style.getPropertyValue("--sb-scripture-width")
    ).toBe("50ch");
  });
});

describe("index.html early config script: limits and tables", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sb-early-config");
  });

  it("uses the same size and key limits as LoginManager's local config read", () => {
    const script = earlyConfigScript();

    expect(script).toContain(
      `"sb-profile-config-local", ${MAX_LOCAL_CONFIG_JSON_LENGTH}`
    );
    expect(script).toContain(
      `Object.keys(legacy).length > ${MAX_LOCAL_CONFIG_KEYS}`
    );
  });

  it("ignores a local config the app itself would treat as corrupt", () => {
    const tooManyKeys: Record<string, unknown> = { uiSize: "XL" };
    for (let i = 0; i <= MAX_LOCAL_CONFIG_KEYS; i++) tooManyKeys[`k${i}`] = i;
    const html = runEarlyConfig(tooManyKeys);
    expect(html.hasAttribute("data-sb-early-config")).toBe(false);
    expect(html.getAttribute("style")).toBeNull();

    const tooLong = {
      uiSize: "XL",
      pad: "x".repeat(MAX_LOCAL_CONFIG_JSON_LENGTH),
    };
    expect(runEarlyConfig(tooLong).getAttribute("style")).toBeNull();
  });

  it("uses the same tables and width range as the settings and styles", () => {
    const script = earlyConfigScript();
    const table = (name: string) =>
      new Function(
        `return ${new RegExp(`var ${name} = (\\{[^}]*\\});`).exec(script)![1]}`
      )();

    expect(table("uiScales")).toEqual(UI_SIZE_SCALE_MAP);

    const cssSizes: Record<string, number> = {};
    for (const m of baseCss.matchAll(
      /\.sb-font-size-(\w+)\s*{\s*font-size:\s*(\d+)px/g
    )) {
      cssSizes[m[1]!.toUpperCase()] = Number(m[2]);
    }
    expect(table("fontSizes")).toEqual(cssSizes);

    expect(script).toContain(`width >= ${MIN_SCRIPTURE_WIDTH}`);
    expect(script).toContain(`width <= ${MAX_SCRIPTURE_WIDTH}`);
  });
});

describe("index.html icon reveal", () => {
  function iconReadyHandler(fonts: unknown) {
    document.documentElement.className = "sb-icons-pending";
    Object.defineProperty(document, "fonts", {
      value: fonts,
      configurable: true,
    });
    const script = Array.from(
      indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g),
      (match) => match[1]!
    ).find((body) => body.includes("__sbIconsStylesheetReady"))!;
    new Function(script)();
    return (window as unknown as { __sbIconsStylesheetReady: () => void })
      .__sbIconsStylesheetReady;
  }

  afterEach(() => {
    vi.useRealTimers();
    delete (document as unknown as { fonts?: unknown }).fonts;
    document.documentElement.className = "";
  });

  it("keeps icons hidden until a font face has actually loaded", async () => {
    vi.useFakeTimers();
    const load = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([{}]);
    const ready = iconReadyHandler({ load });

    ready();
    await vi.advanceTimersByTimeAsync(0);
    expect(
      document.documentElement.classList.contains("sb-icons-pending")
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(250);
    expect(load).toHaveBeenCalledTimes(3);
    expect(
      document.documentElement.classList.contains("sb-icons-pending")
    ).toBe(false);
  });

  it("reveals icons anyway when the font API is missing", () => {
    vi.useFakeTimers();
    const ready = iconReadyHandler(undefined);

    ready();

    expect(
      document.documentElement.classList.contains("sb-icons-pending")
    ).toBe(false);
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

  it("preloads only the reading font's latin file, as a CORS font fetch", () => {
    const preloads = Array.from(
      indexHtml.matchAll(/<link\b[^>]*rel="preload"[^>]*as="font"[^>]*>/g),
      (match) => match[0]
    );

    expect(preloads).toHaveLength(1);
    expect(preloads[0]).toContain("fonts.gstatic.com/s/plusjakartasans/");
    expect(preloads[0]).toContain('type="font/woff2"');
    expect(preloads[0]).toContain("crossorigin");
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
      `'Plus Jakarta Sans', "Plus Jakarta Sans Fallback", "Plus Jakarta Sans Fallback Roboto", sans-serif`
    );
    expect(withMetricFallback("Newsreader, serif")).toBe(
      `Newsreader, "Newsreader Fallback", "Newsreader Fallback Noto Serif", serif`
    );
    expect(withMetricFallback("Newsreader")).toBe(
      `Newsreader, "Newsreader Fallback", "Newsreader Fallback Noto Serif"`
    );
  });

  it("leaves other stacks and already-covered stacks alone", () => {
    expect(withMetricFallback("Roboto, sans-serif")).toBe("Roboto, sans-serif");
    expect(withMetricFallback("inherit")).toBe("inherit");
    expect(withMetricFallback("system-ui, sans-serif")).toBe(
      "system-ui, sans-serif"
    );
    const covered = `"Newsreader", "Newsreader Fallback", "Newsreader Fallback Noto Serif", serif`;
    expect(withMetricFallback(covered)).toBe(covered);
  });

  it("declares every face in the critical CSS with the calibrated numbers", () => {
    for (const face of FALLBACK_FACES) {
      const rule = new RegExp(
        `@font-face\\s*{[^}]*font-family:\\s*"${face.family}"[^}]*}`
      ).exec(baseCss);
      expect(rule, face.family).not.toBeNull();
      const css = rule![0];
      expect(css.match(/local\("([^"]+)"\)/g)).toEqual(
        face.local.map((name) => `local("${name}")`)
      );
      expect(css).toContain(`size-adjust: ${face.sizeAdjust}%`);
      expect(css).toContain(`ascent-override: ${face.ascent}%`);
      expect(css).toContain(`descent-override: ${face.descent}%`);
      expect(css).toContain("line-gap-override: 0%");
    }
  });

  it("keeps the overrides consistent with the web fonts' own line metrics", () => {
    const webMetrics: Record<string, { ascent: number; descent: number }> = {
      "plus jakarta sans": { ascent: 103.8, descent: 22.2 },
      newsreader: { ascent: 73.5, descent: 26.5 },
    };
    for (const face of FALLBACK_FACES) {
      const real = webMetrics[face.web]!;
      expect(face.ascent * (face.sizeAdjust / 100)).toBeCloseTo(real.ascent, 0);
      expect(face.descent * (face.sizeAdjust / 100)).toBeCloseTo(
        real.descent,
        0
      );
    }
  });

  it("also covers a theme's plain body font", () => {
    const css = generateThemeCssVariables({
      ...LIGHT_THEME,
      variables: { ...LIGHT_THEME.variables, fontFamily: "Newsreader, serif" },
    });

    expect(css).toContain(
      `--sb-font-family: Newsreader, "Newsreader Fallback", "Newsreader Fallback Noto Serif", serif;`
    );
  });

  it("puts the fallback in the first-paint font defaults and theme output", () => {
    expect(baseCss.replace(/\s+/g, " ")).toContain(
      `--text-verse-font: "Plus Jakarta Sans", "Plus Jakarta Sans Fallback", "Plus Jakarta Sans Fallback Roboto", sans-serif;`
    );
    for (const theme of [LIGHT_THEME, DARK_THEME]) {
      const css = generateThemeCssVariables(theme);
      expect(css).toContain(
        `--sb-verse-font-family: Plus Jakarta Sans, "Plus Jakarta Sans Fallback", "Plus Jakarta Sans Fallback Roboto", sans-serif;`
      );
      expect(css).toContain(
        `--sb-book-title-font-family: Newsreader, "Newsreader Fallback", "Newsreader Fallback Noto Serif", serif;`
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

  it("keeps boxed verse numbers from changing the line's width, in poetry too", () => {
    expect(readerCss).toMatch(
      /\.sb-verse-number-annotated\s*{[^}]*margin-inline-start:\s*calc\(0\.625em - 3px\)[^}]*margin-inline-end:\s*calc\(0\.3125em - 3px\)/
    );
    expect(readerCss).toMatch(
      /\.sb-verse-line \.sb-verse-number-annotated\s*{[^}]*margin-inline-start:\s*calc\(-1\.2em - 3px\)/
    );
  });

  it("starts verse line height at the default", () => {
    expect(baseCss).toContain(
      `--text-verse-line-height: ${DEFAULT_VERSE_LINE_HEIGHT};`
    );
  });
});
