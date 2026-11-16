// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";
import { writeSitePackage } from "@packages/seed-bible-extension-scripts/src/lib/sitePackage";

/*
 * `package` writes a folder meant to be uploaded as it is to GitHub Pages,
 * Cloudflare or any static host, at an address it can't know in advance.
 */
describe("the hostable package", () => {
  let outDir: string;
  const bundle = new TextEncoder().encode("export default 1;");
  const meta = {
    id: "verse-art",
    version: "1.0.0",
    permissions: ["reading:selection"],
    translations: {
      en: { title: "Verse <Art>", description: "Pictures & verses." },
    },
  };

  beforeEach(async () => {
    outDir = await mkdtemp(path.join(os.tmpdir(), "sb-site-"));
    await writeSitePackage({ outDir, bundle, meta });
  });

  afterEach(() => rm(outDir, { recursive: true, force: true }));

  const read = (name: string) => readFile(path.join(outDir, name), "utf-8");

  it("links the bundle relative to the set, pinned to its hash", async () => {
    const set = JSON.parse(await read("extension-set.json"));
    const [extension] = set.extensions;

    expect(extension.url).toMatch(/^\.\/verse-art-[0-9a-f]{12}\.js$/);
    expect(await read(extension.url)).toBe("export default 1;");
    expect(extension.meta).toEqual({
      ...meta,
      integrity: `sha384-${createHash("sha384").update(bundle).digest("base64")}`,
    });
  });

  it("names the bundle after its contents, so a cached set can't point at another build", async () => {
    const first = await readdir(outDir);
    await writeSitePackage({
      outDir,
      bundle: new TextEncoder().encode("export default 2;"),
      meta,
    });
    const second = await readdir(outDir);

    const bundles = (files: string[]) => files.filter((f) => f.endsWith(".js"));
    expect(bundles(second)).toHaveLength(1);
    expect(bundles(second)).not.toEqual(bundles(first));
  });

  it("includes the icon, named after its contents and linked relative to the set", async () => {
    const icon = {
      bytes: new TextEncoder().encode("<svg/>"),
      mimeType: "image/svg+xml",
      extension: ".svg",
    };
    await writeSitePackage({
      outDir,
      bundle,
      meta: { ...meta, icon: "assets/icon.svg" },
      icon,
    });

    const set = JSON.parse(await read("extension-set.json"));
    const iconUrl = set.extensions[0].meta.icon;
    expect(iconUrl).toMatch(/^\.\/icon-[0-9a-f]{12}\.svg$/);
    expect(await read(iconUrl)).toBe("<svg/>");
    // The install page shows it too.
    const dom = new JSDOM(await read("index.html"));
    expect(dom.window.document.querySelector("img")?.getAttribute("src")).toBe(
      iconUrl
    );
    dom.window.close();
  });

  it("keeps an icon given as a link, in the set and on the install page", async () => {
    const icon = "https://cdn.example.com/verse-art.png";
    await writeSitePackage({ outDir, bundle, meta: { ...meta, icon } });

    const set = JSON.parse(await read("extension-set.json"));
    expect(set.extensions[0].meta.icon).toBe(icon);
    expect((await readdir(outDir)).some((f) => f.startsWith("icon-"))).toBe(
      false
    );
    const dom = new JSDOM(await read("index.html"));
    expect(dom.window.document.querySelector("img")?.getAttribute("src")).toBe(
      icon
    );
    dom.window.close();
  });

  it("lets Seed Bible fetch the files from Cloudflare and GitHub Pages", async () => {
    const headers = await read("_headers");

    expect(headers).toContain(
      "/extension-set.json\n  Access-Control-Allow-Origin: *\n  Cache-Control: no-cache"
    );
    expect(headers).toContain("/*.js\n  Access-Control-Allow-Origin: *");
    expect(await readdir(outDir)).toContain(".nojekyll");
  });

  it("has an install page whose button works at whatever address it's hosted", async () => {
    const dom = new JSDOM(await read("index.html"), {
      url: "https://someone.github.io/verse-art/",
      runScripts: "dangerously",
    });
    const document = dom.window.document;
    const install = new URL(
      (document.getElementById("install") as HTMLAnchorElement).href
    );

    expect(install.origin + install.pathname).toBe("https://seedbible.org/");
    expect(install.searchParams.get("extensionSet")).toBe(
      "https://someone.github.io/verse-art/extension-set.json"
    );
    expect(install.searchParams.get("autoinstall-verse-art")).toBe("true");
    // The title is text, not markup.
    expect(document.querySelector("h1")!.textContent).toBe("Verse <Art>");
    expect(document.querySelector("h1")!.children).toHaveLength(0);
    dom.window.close();
  });
});
