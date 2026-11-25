import { findDevToolsLeaks } from "../../../../script/lib/devToolsBundleCheck";
import type { ViteManifestChunk } from "../../../../script/lib/precacheManifest";

const DEV_TOOLS_SOURCE =
  "packages/seed-bible/seed-bible/app/devTools/devTools.ts";

function check(
  manifest: Record<string, ViteManifestChunk>,
  files: Record<string, string>,
  native = false
) {
  return findDevToolsLeaks(manifest, {
    native,
    allScripts: Object.keys(files),
    readFile: (file) => files[file] ?? "",
  });
}

describe("findDevToolsLeaks", () => {
  it("passes a web build whose developer tools are only loaded on demand", () => {
    const manifest = {
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        imports: ["_vendor"],
      },
      _vendor: { file: "assets/vendor.js" },
      [DEV_TOOLS_SOURCE]: { file: "assets/devTools.js", imports: ["_vendor"] },
    };
    const files = {
      "assets/index.js": 'import("./devTools.js")',
      "assets/vendor.js": "export const preact = 1;",
      "assets/devTools.js": 'el.setAttribute("data-sb-component", name)',
    };

    expect(check(manifest, files)).toEqual([]);
  });

  it("fails when a developer-tools module is statically imported at startup", () => {
    const manifest = {
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        imports: [DEV_TOOLS_SOURCE],
      },
      [DEV_TOOLS_SOURCE]: { file: "assets/devTools.js" },
    };

    expect(
      check(manifest, { "assets/index.js": "", "assets/devTools.js": "" })
    ).toEqual([
      expect.stringContaining(
        "assets/devTools.js (" + DEV_TOOLS_SOURCE + ") loads at startup"
      ),
    ]);
  });

  it("fails when developer-tools code was bundled into a startup chunk", () => {
    const manifest = {
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        imports: ["_vendor"],
      },
      _vendor: { file: "assets/vendor.js" },
    };
    const files = {
      "assets/index.js": "",
      "assets/vendor.js":
        'title: "Developer", description: "Tools for working on Seed Bible."',
    };

    expect(check(manifest, files)).toEqual([
      'assets/vendor.js loads at startup and contains developer-tools code ("Tools for working on Seed Bible").',
    ]);
  });

  it("fails a native build that has developer tools anywhere, even on demand", () => {
    const manifest = {
      "index.html": { file: "assets/index.js", isEntry: true },
      [DEV_TOOLS_SOURCE]: { file: "assets/devTools.js" },
    };
    const files = {
      "assets/index.js": "",
      "assets/devTools.js": 'el.setAttribute("data-sb-component", name)',
    };

    expect(check(manifest, files, true)).toEqual([
      expect.stringContaining("is in the native build"),
      'assets/devTools.js contains developer-tools code ("data-sb-component"), which the native build must not have.',
    ]);
  });

  it("passes a native build with no developer tools", () => {
    const manifest = {
      "index.html": { file: "assets/index.js", isEntry: true },
    };

    expect(check(manifest, { "assets/index.js": "render(app)" }, true)).toEqual(
      []
    );
  });
});
