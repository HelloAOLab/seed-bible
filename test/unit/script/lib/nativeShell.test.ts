import { readFileSync } from "fs";
import path from "path";
import {
  addNativeEntry,
  fillNativeShellPlaceholders,
  findUnfilledPlaceholders,
} from "../../../../script/lib/nativeShell";
import { readInjectedConfig } from "../../../../packages/seed-bible/seed-bible/app/appConfig";
import { readInjectedApiResponseSnapshot } from "../../../../packages/seed-bible/seed-bible/app/apiResponseSeed";
import { readInjectedCustomizationSeed } from "../../../../packages/seed-bible/seed-bible/app/customizationSeed";
import { decideHydration } from "../../../../packages/seed-bible/seed-bible/app/hydrationGate";

const TEMPLATE = readFileSync(
  path.resolve(__dirname, "../../../../index.html"),
  "utf-8"
);

const VALUES = {
  themeStyleText: "body {\n--sb-background: #f8fafc;\n}",
  themePresetStyleText: {
    light: "body { --sb-background: #f8fafc; }",
    dark: "body { --sb-background: #0a0a0a; }",
  },
  publicOrigin: "https://seedbible.org",
};

function loadDocument(html: string): void {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.documentElement.innerHTML = parsed.documentElement.innerHTML;
  document.documentElement.lang = parsed.documentElement.lang;
}

describe("fillNativeShellPlaceholders", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
    document.documentElement.removeAttribute("lang");
  });

  it("fills every placeholder in index.html except the critical CSS, which its own plugin fills", () => {
    const html = fillNativeShellPlaceholders(TEMPLATE, VALUES);

    expect(findUnfilledPlaceholders(html)).toEqual(["CRITICAL_STYLE_TAG"]);
  });

  it("produces a page the client boots from with a fresh-install state", () => {
    loadDocument(fillNativeShellPlaceholders(TEMPLATE, VALUES));

    const config = readInjectedConfig();
    expect(config).toMatchObject({
      basePath: "",
      assetHost: "",
      renderedAsMobile: true,
      publicOrigin: "https://seedbible.org",
    });
    // No server rendered this page, so the client renders rather than
    // hydrating onto it.
    expect(
      decideHydration({
        config,
        pathname: "/",
        search: "",
        container: document.getElementById("app")!,
        clientCommit: "abc123",
      })
    ).toEqual({ hydrate: false, reason: "no-ssr-content" });
    expect(readInjectedApiResponseSnapshot()).toEqual({});
    expect(readInjectedCustomizationSeed()).toBeUndefined();
    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it("gives the pre-load theme script presets it can parse, and the fallback theme", () => {
    loadDocument(fillNativeShellPlaceholders(TEMPLATE, VALUES));

    const presets = document.getElementById("sb-theme-presets")?.textContent;
    expect(JSON.parse(presets ?? "")).toEqual(VALUES.themePresetStyleText);
    expect(document.getElementById("sb-theme-styles")?.textContent).toContain(
      "--sb-background: #f8fafc"
    );
  });

  it("escapes markup in the presets so it can't close the script tag", () => {
    const html = fillNativeShellPlaceholders(
      '<script type="application/json"><!-- THEME_PRESETS_JSON --></script>',
      { ...VALUES, themePresetStyleText: { x: "</script><b>" } }
    );

    expect(html).toBe(
      '<script type="application/json">{"x":"\\u003c/script>\\u003cb>"}</script>'
    );
  });

  it("leaves placeholders it doesn't know about in place, so the build can flag them", () => {
    const html = fillNativeShellPlaceholders(
      "<div><!-- APP_HTML --><!-- SOMETHING_NEW --></div>",
      VALUES
    );

    expect(html).toBe("<div><!-- SOMETHING_NEW --></div>");
    expect(findUnfilledPlaceholders(html)).toEqual(["SOMETHING_NEW"]);
  });
});

describe("findUnfilledPlaceholders", () => {
  it("ignores ordinary prose comments", () => {
    expect(
      findUnfilledPlaceholders(
        "<!-- Default matches LIGHT_THEME in ThemeManager. --><!-- x -->"
      )
    ).toEqual([]);
  });
});

describe("addNativeEntry", () => {
  it("loads the app-only script after the app's own entry", () => {
    const html = addNativeEntry(TEMPLATE);

    expect(html.indexOf('src="/standalone/native.ts"')).toBeGreaterThan(
      html.indexOf('src="/standalone/index.tsx"')
    );
    expect(html.indexOf('src="/standalone/native.ts"')).toBeLessThan(
      html.indexOf("</body>")
    );
  });
});
