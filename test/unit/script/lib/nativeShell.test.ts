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
import {
  decideHydration,
  hasServerRenderedContent,
} from "../../../../packages/seed-bible/seed-bible/app/hydrationGate";
import { readInjectedFriendLinkSeed } from "../../../../packages/seed-bible/seed-bible/app/friendLinkSeed";
import { LAYOUT_ATTRIBUTE } from "../../../../packages/seed-bible/seed-bible/app/layoutAttribute";
import {
  restoreViewport,
  SIDEWAYS_PHONE,
  SIDEWAYS_TABLET,
  stubViewport,
  type StubbedDevice,
} from "../../seed-bible/testUtils/stubViewport";

const UPRIGHT_PHONE: StubbedDevice = {
  width: 390,
  height: 844,
  screen: { width: 390, height: 844 },
  pointer: "coarse",
};

const UPRIGHT_TABLET: StubbedDevice = {
  width: 820,
  height: 1180,
  screen: { width: 820, height: 1180 },
  pointer: "coarse",
};

/** The inline script in the page's head that fills in the layout attribute. */
function layoutScript(html: string): string {
  const script = Array.from(
    html.matchAll(/<script>([\s\S]*?)<\/script>/g),
    (match) => match[1]!
  ).find((body) => body.includes(LAYOUT_ATTRIBUTE));
  if (!script) throw new Error("the page has no layout script");
  return script;
}

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
  document.documentElement.dataset.sbAppLayout =
    parsed.documentElement.dataset.sbAppLayout;
}

describe("fillNativeShellPlaceholders", () => {
  afterEach(() => {
    document.documentElement.innerHTML = "<head></head><body></body>";
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute(LAYOUT_ATTRIBUTE);
    restoreViewport();
    vi.unstubAllGlobals();
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
    // So the app starts from the real window rather than the phone guess:
    // an iPad gets the desktop layout from the first draw.
    expect(
      hasServerRenderedContent(config, document.getElementById("app")!)
    ).toBe(false);
    expect(readInjectedApiResponseSnapshot()).toEqual({});
    expect(readInjectedCustomizationSeed()).toBeUndefined();
    expect(readInjectedFriendLinkSeed()).toBeUndefined();
    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  // Every install gets the same page, so it can't name one layout for all of
  // them; the inline script in its head picks it on the device.
  it.each([
    ["an iPad", SIDEWAYS_TABLET, "desktop"],
    ["an iPad held upright", UPRIGHT_TABLET, "desktop"],
    ["a phone", UPRIGHT_PHONE, "mobile"],
    ["a phone held sideways", SIDEWAYS_PHONE, "mobile"],
  ])(
    "styles the page for %s's layout before the app loads",
    (_name, device, layout) => {
      const html = fillNativeShellPlaceholders(TEMPLATE, VALUES);
      loadDocument(html);
      stubViewport(device);

      new Function(layoutScript(html))();

      expect(document.documentElement.getAttribute(LAYOUT_ATTRIBUTE)).toBe(
        layout
      );
    }
  );

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
