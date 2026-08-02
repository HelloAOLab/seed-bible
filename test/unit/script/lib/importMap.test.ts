import { readFileSync } from "node:fs";
import path from "node:path";
import {
  EXTENSION_API_SPECIFIERS,
  buildImportMap,
  devImportMapUrl,
  extensionApiBuildInputs,
  injectImportMap,
  renderImportMapScript,
  type ExtensionApiSpecifier,
} from "../../../../script/lib/importMap";

const ASSET_BASE_URL =
  "https://assets.example/branches/main/2026-07-28-abc123/";

/** Resolves every shim to a plausible hashed chunk URL under a CDN base. */
const resolveBuilt = (entry: ExtensionApiSpecifier) =>
  `${ASSET_BASE_URL}assets/${entry.entryName}-HASH.js`;

describe("EXTENSION_API_SPECIFIERS", () => {
  it("exposes the seed-bible API and the preact runtime", () => {
    const specifiers = EXTENSION_API_SPECIFIERS.map((e) => e.specifier);
    expect(specifiers).toEqual([
      "seed-bible",
      "seed-bible/components",
      "seed-bible/i18n",
      "preact",
      "preact/hooks",
      "preact/jsx-runtime",
      "preact/compat",
      "@preact/signals",
    ]);
  });

  // `seed-bible/managers` re-exports every manager module, including the
  // CasualOS gateway and the login manager. Extensions reach the managers they
  // need through the `SeedBibleState` passed to `init(context)` instead.
  it("does not expose seed-bible/managers", () => {
    const specifiers = EXTENSION_API_SPECIFIERS.map((e) => e.specifier);
    expect(specifiers).not.toContain("seed-bible/managers");
  });

  // Entry names key `build.rolldownOptions.input` and are how the plugin finds
  // each emitted chunk again; a duplicate would silently drop a specifier.
  it("gives every specifier a distinct entry name and source path", () => {
    const entryNames = EXTENSION_API_SPECIFIERS.map((e) => e.entryName);
    const sourcePaths = EXTENSION_API_SPECIFIERS.map((e) => e.sourcePath);
    expect(new Set(entryNames).size).toBe(entryNames.length);
    expect(new Set(sourcePaths).size).toBe(sourcePaths.length);
  });

  // The shims are what make the specifiers resolvable at all — an entry
  // pointing at a file that doesn't exist fails the build with a much less
  // obvious message than this assertion does.
  it("points at shim files that exist", () => {
    for (const entry of EXTENSION_API_SPECIFIERS) {
      const file = path.resolve(
        import.meta.dirname,
        "../../../..",
        entry.sourcePath
      );
      expect(() => readFileSync(file, "utf-8")).not.toThrow();
    }
  });
});

describe("extensionApiBuildInputs", () => {
  it("maps every entry name to its shim source path", () => {
    const inputs = extensionApiBuildInputs();
    expect(Object.keys(inputs)).toHaveLength(EXTENSION_API_SPECIFIERS.length);
    expect(inputs["extension-api-seed-bible"]).toBe(
      "standalone/extension-api/seed-bible.ts"
    );
    expect(inputs["extension-api-preact-signals"]).toBe(
      "standalone/extension-api/preact-signals.ts"
    );
  });
});

describe("buildImportMap", () => {
  it("includes every exposed specifier", () => {
    const map = buildImportMap(resolveBuilt);
    expect(Object.keys(map.imports).sort()).toEqual(
      EXTENSION_API_SPECIFIERS.map((e) => e.specifier).sort()
    );
  });

  // In CI `base` is an absolute per-branch CDN URL, so an extension resolves
  // the API from the same deployment's copy as the rest of the app.
  it("keeps the absolute asset base on built URLs", () => {
    const map = buildImportMap(resolveBuilt);
    expect(map.imports["seed-bible"]).toBe(
      `${ASSET_BASE_URL}assets/extension-api-seed-bible-HASH.js`
    );
    for (const url of Object.values(map.imports)) {
      expect(url.startsWith(ASSET_BASE_URL)).toBe(true);
    }
  });

  it("serves shims from their project path in development", () => {
    const map = buildImportMap(devImportMapUrl);
    expect(map.imports["preact"]).toBe("/standalone/extension-api/preact.ts");
  });

  // A partial map would render fine and break only third-party extensions,
  // which is exactly the kind of failure that goes unnoticed for a release.
  it("throws rather than emitting a map with a missing specifier", () => {
    expect(() =>
      buildImportMap((entry) =>
        entry.specifier === "preact" ? undefined : resolveBuilt(entry)
      )
    ).toThrow(/extension-api-preact/);
  });
});

describe("renderImportMapScript", () => {
  it("escapes < so the JSON cannot close the script tag early", () => {
    const html = renderImportMapScript({
      imports: { evil: "/x</script><script>alert(1)</script>" },
    });
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c");
  });
});

describe("injectImportMap", () => {
  const map = buildImportMap(resolveBuilt);

  /** The project's real template, which is what actually gets transformed. */
  function readIndexHtml(): string {
    return readFileSync(
      path.resolve(import.meta.dirname, "../../../..", "index.html"),
      "utf-8"
    );
  }

  it("adds the import map to the real index.html template", () => {
    const html = injectImportMap(readIndexHtml(), map);
    expect(html).toContain('<script type="importmap">');
    expect(html).toContain('"seed-bible":');
  });

  // The one property the whole feature rests on: a browser rejects an import
  // map that shows up after module loading has already started.
  it("places the map before any module script", () => {
    const html = injectImportMap(readIndexHtml(), map);
    expect(html.indexOf('type="importmap"')).toBeLessThan(
      html.indexOf('type="module"')
    );
  });

  // In dev, Vite prepends its HMR client to <head> before this runs, so
  // inserting straight after <head> has to land above an existing script.
  it("inserts above tags an earlier transform already prepended to head", () => {
    const html = injectImportMap(
      '<html><head><script type="module" src="/@vite/client"></script></head><body></body></html>',
      map
    );
    expect(html.indexOf('type="importmap"')).toBeLessThan(
      html.indexOf("/@vite/client")
    );
  });

  it("handles a head tag carrying attributes", () => {
    const html = injectImportMap(
      '<html><head lang="en"></head><body></body></html>',
      map
    );
    expect(html).toContain('<head lang="en">');
    expect(html.indexOf('type="importmap"')).toBeGreaterThan(
      html.indexOf('<head lang="en">')
    );
  });

  it("throws on a template with no head", () => {
    expect(() => injectImportMap("<html><body></body></html>", map)).toThrow(
      /no <head> tag/
    );
  });
});
