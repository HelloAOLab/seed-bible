import {
  selectAndRelocateCoreAssets,
  selectCoreAssetFiles,
  type PrecacheManifestEntry,
  type ViteManifestChunk,
} from "../../../../script/lib/precacheManifest";

const ASSET_BASE_URL =
  "https://assets.example/branches/main/2026-07-28-abc123/";

/**
 * A stand-in for the client build's Vite manifest: one entry chunk that pulls in
 * a vendor chunk and a bundled locale, references a stylesheet and a logo, and a
 * dynamically imported extension chunk that nothing statically imports.
 */
function createViteManifest(): Record<string, ViteManifestChunk> {
  return {
    "packages/seed-bible/seed-bible/app/init.tsx": {
      file: "assets/index-AAA.js",
      isEntry: true,
      imports: ["_vendor-BBB.js", "_I18nManager-CCC.js"],
      css: ["assets/index-DDD.css"],
      assets: ["assets/logo-EEE.svg"],
    },
    "_vendor-BBB.js": {
      file: "assets/vendor-BBB.js",
      imports: ["_shared-FFF.js"],
    },
    "_I18nManager-CCC.js": { file: "assets/I18nManager-CCC.js" },
    "_shared-FFF.js": { file: "assets/shared-FFF.js" },
    "packages/today-screen/extension.tsx": { file: "assets/extension-GGG.js" },
  };
}

function entry(url: string, size = 1024): PrecacheManifestEntry {
  return { url, revision: null, size };
}

describe("selectCoreAssetFiles()", () => {
  it("follows static imports transitively from every entry", () => {
    const core = selectCoreAssetFiles(createViteManifest());

    expect([...core].sort()).toEqual([
      "assets/I18nManager-CCC.js",
      "assets/index-AAA.js",
      "assets/index-DDD.css",
      "assets/logo-EEE.svg",
      "assets/shared-FFF.js",
      "assets/vendor-BBB.js",
    ]);
  });

  it("leaves out chunks nothing statically imports", () => {
    const core = selectCoreAssetFiles(createViteManifest());

    // Reached only through a dynamic `import()`, so it is runtime-cached on
    // first use rather than pulled into the install.
    expect(core.has("assets/extension-GGG.js")).toBe(false);
  });

  it("survives a manifest whose import points at a missing chunk", () => {
    const core = selectCoreAssetFiles({
      "app/init.tsx": {
        file: "assets/index-AAA.js",
        isEntry: true,
        imports: ["_gone.js"],
      },
    });

    expect([...core]).toEqual(["assets/index-AAA.js"]);
  });

  it("does not loop on chunks that import each other", () => {
    const core = selectCoreAssetFiles({
      "app/init.tsx": {
        file: "assets/a.js",
        isEntry: true,
        imports: ["_b.js"],
      },
      "_b.js": { file: "assets/b.js", imports: ["app/init.tsx"] },
    });

    expect([...core].sort()).toEqual(["assets/a.js", "assets/b.js"]);
  });
});

describe("selectAndRelocateCoreAssets()", () => {
  const coreFiles = selectCoreAssetFiles(createViteManifest());

  function run(entries: PrecacheManifestEntry[]) {
    return selectAndRelocateCoreAssets(entries, {
      coreFiles,
      assetBaseUrl: ASSET_BASE_URL,
    });
  }

  it("keeps the core chunks and rewrites them to the absolute asset URL", () => {
    const { manifest } = run([
      entry("assets/index-AAA.js"),
      entry("assets/vendor-BBB.js"),
      entry("assets/index-DDD.css"),
    ]);

    // Workbox emits paths relative to the worker's scope, but nothing is served
    // from the site root — the rewrite is what stops every precache request
    // 404ing and aborting the install.
    expect(manifest.map((item) => item.url)).toEqual([
      `${ASSET_BASE_URL}assets/index-AAA.js`,
      `${ASSET_BASE_URL}assets/vendor-BBB.js`,
      `${ASSET_BASE_URL}assets/index-DDD.css`,
    ]);
  });

  it("carries the rest of each entry through unchanged", () => {
    const { manifest } = run([
      { url: "assets/index-AAA.js", revision: null, size: 4096 },
    ]);

    expect(manifest[0]).toEqual({
      url: `${ASSET_BASE_URL}assets/index-AAA.js`,
      revision: null,
      size: 4096,
    });
  });

  it("drops assets no boot chunk needs", () => {
    const { manifest } = run([
      entry("assets/index-AAA.js"),
      entry("assets/extension-GGG.js"),
      entry("assets/ar-HHH.js"),
    ]);

    expect(manifest.map((item) => item.url)).toEqual([
      `${ASSET_BASE_URL}assets/index-AAA.js`,
    ]);
  });

  it("keeps images and fonts even when no boot chunk references them", () => {
    const { manifest } = run([
      entry("assets/background-III.webp"),
      entry("assets/DMSans-JJJ.woff2"),
      entry("assets/favicon-KKK.ico"),
    ]);

    // Fonts and background images are reached from CSS `url()`, which Vite does
    // not attribute to the chunk, so they have to be kept on extension alone.
    expect(manifest.map((item) => item.url)).toEqual([
      `${ASSET_BASE_URL}assets/background-III.webp`,
      `${ASSET_BASE_URL}assets/DMSans-JJJ.woff2`,
      `${ASSET_BASE_URL}assets/favicon-KKK.ico`,
    ]);
  });

  it("passes root-served entries through without rewriting them", () => {
    const { manifest } = run([
      entry("manifest.webmanifest"),
      entry("registerSW.js"),
    ]);

    // These really are at the site root, unlike the hashed chunks.
    expect(manifest.map((item) => item.url)).toEqual([
      "manifest.webmanifest",
      "registerSW.js",
    ]);
  });

  it("warns about a core asset the glob never produced", () => {
    // Workbox applies its file-size limit while globbing, before this transform
    // runs, so an oversized vendor chunk arrives simply missing.
    const { manifest, warnings } = run([entry("assets/index-AAA.js")]);

    expect(manifest.map((item) => item.url)).toEqual([
      `${ASSET_BASE_URL}assets/index-AAA.js`,
    ]);
    expect(warnings).toHaveLength(5);
    expect(warnings.join("\n")).toContain("assets/vendor-BBB.js");
    expect(warnings[0]).toContain("will not boot offline");
  });

  it("reports no warnings when every core asset is present", () => {
    const { warnings } = run([...coreFiles].map((file) => entry(file)));

    expect(warnings).toEqual([]);
  });

  it("does not warn about root-served core entries", () => {
    // `index.html` shows up in the manifest as an entry but is rendered per
    // request, so it is never globbed and must not be reported as missing.
    const { warnings } = selectAndRelocateCoreAssets([], {
      coreFiles: new Set(["index.html"]),
      assetBaseUrl: ASSET_BASE_URL,
    });

    expect(warnings).toEqual([]);
  });
});
