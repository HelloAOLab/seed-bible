import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  startDevExtensionServer,
  type DevExtensionServer,
} from "@packages/seed-bible-extension-scripts/src/lib/devExtensionServer";

// @vitest-environment node

/*
 * What `dev` serves a sandboxed extension from: it has to look to Seed
 * Bible like a published extension (an ExtensionSet whose integrity
 * matches the bundle), but always describe the bundle as it is now.
 */
describe("the dev extension server", () => {
  let root: string;
  let server: DevExtensionServer;
  const bundlePath = () => path.join(root, "dist", "dev", "index.js");

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "sb-dev-ext-"));
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify({
        id: "my-ext",
        version: "0.1.0",
        permissions: ["reading:position"],
        settings: { greeting: { type: "string" } },
        translations: { en: { title: "Mine", description: "" } },
      })
    );
    await writeFile(path.join(root, "index.ts"), "");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.dirname(bundlePath()), { recursive: true });
    await writeFile(bundlePath(), "export default 1;");
    server = await startDevExtensionServer({
      root,
      bundlePath: bundlePath(),
      port: 0,
    });
  });

  afterEach(async () => {
    await server.close();
    await rm(root, { recursive: true, force: true });
  });

  const sha384 = (text: string) =>
    `sha384-${createHash("sha384").update(text).digest("base64")}`;

  it("serves an ExtensionSet any page can fetch, pinned to the bundle as built", async () => {
    const response = await fetch(server.setUrl);
    const set = await response.json();

    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(set.extensions).toHaveLength(1);
    const [extension] = set.extensions;
    expect(extension.meta).toMatchObject({
      id: "my-ext",
      permissions: ["reading:position"],
      settings: { greeting: { type: "string" } },
      integrity: sha384("export default 1;"),
    });
    const bundle = await fetch(extension.url);
    expect(await bundle.text()).toBe("export default 1;");
  });

  it("describes the latest build and manifest on every request", async () => {
    await writeFile(bundlePath(), "export default 2;");
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify({
        id: "my-ext",
        permissions: ["reading:position", "reading:selection"],
        translations: { en: { title: "Mine", description: "" } },
      })
    );

    const set = await (await fetch(server.setUrl)).json();

    expect(set.extensions[0].meta).toMatchObject({
      permissions: ["reading:position", "reading:selection"],
      integrity: sha384("export default 2;"),
    });
  });

  it("serves the icon extension.json names, and links it from the set", async () => {
    await writeFile(path.join(root, "icon.svg"), "<svg/>");
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify({
        id: "my-ext",
        icon: "icon.svg",
        translations: { en: { title: "Mine", description: "" } },
      })
    );

    const set = await (await fetch(server.setUrl)).json();
    const icon = await fetch(set.extensions[0].meta.icon);

    expect(set.extensions[0].meta.icon).toMatch(
      /^http:\/\/localhost:\d+\/icon\.svg$/
    );
    expect(icon.headers.get("content-type")).toBe("image/svg+xml");
    expect(await icon.text()).toBe("<svg/>");
  });

  it("says it isn't ready while there's no bundle yet", async () => {
    await rm(bundlePath());

    expect((await fetch(server.setUrl)).status).toBe(503);
  });
  it("serves local screenshots in manifest order and preserves hosted links", async () => {
    await writeFile(path.join(root, "shot.png"), "png bytes");
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify({
        id: "my-ext",
        screenshots: [
          { src: "shot.png", caption: "overview" },
          { src: "https://cdn.example.com/shot.jpg" },
        ],
        translations: {
          en: { title: "Mine", description: "", overview: "Overview" },
        },
      })
    );
    const set = await (await fetch(server.setUrl)).json();
    const shots = set.extensions[0].meta.screenshots;
    expect(shots).toEqual([
      {
        src: expect.stringMatching(
          /^http:\/\/localhost:\d+\/screenshots\/0\.png$/
        ),
        caption: "overview",
      },
      { src: "https://cdn.example.com/shot.jpg" },
    ]);
    const response = await fetch(shots[0].src);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(await response.text()).toBe("png bytes");
    for (const url of [
      "/screenshots/1.jpg",
      "/screenshots/99.png",
      "/screenshots/0.jpg",
      "/screenshots/no.png",
    ]) {
      expect((await fetch(new URL(url, server.setUrl))).status).toBe(404);
    }
    await writeFile(path.join(root, "shot.png"), "updated png");
    expect(await (await fetch(shots[0].src)).text()).toBe("updated png");
  });

  it("keeps serving the set and remaining image when a screenshot is missing", async () => {
    await writeFile(path.join(root, "good.png"), "good");
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify({
        id: "my-ext",
        screenshots: [{ src: "missing.png" }, { src: "good.png" }],
        translations: { en: { title: "Mine", description: "" } },
      })
    );
    const response = await fetch(server.setUrl);
    expect(response.status).toBe(200);
    const shots = (await response.json()).extensions[0].meta.screenshots;
    expect(shots[0].src).toBe("missing.png");
    expect(shots[1].src).toMatch(/\/screenshots\/1\.png$/);
    expect(await (await fetch(shots[1].src)).text()).toBe("good");
    expect(
      (await fetch(new URL("/screenshots/0.png", server.setUrl))).status
    ).toBe(404);
  });

  it.each([null, "invalid", [null]])(
    "keeps serving malformed screenshot data %j",
    async (screenshots) => {
      await writeFile(
        path.join(root, "extension.json"),
        JSON.stringify({
          id: "my-ext",
          screenshots,
          translations: { en: { title: "Mine", description: "" } },
        })
      );
      const response = await fetch(server.setUrl);
      expect(response.status).toBe(200);
      expect((await response.json()).extensions[0].meta.screenshots).toEqual(
        screenshots
      );
      expect(
        (await fetch(new URL("/screenshots/0.png", server.setUrl))).status
      ).toBe(404);
    }
  );

  it("does not serve screenshots outside the extension project", async () => {
    const outside = path.join(path.dirname(root), "outside.png");
    await writeFile(outside, "private bytes");
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify({
        id: "my-ext",
        screenshots: [{ src: "../outside.png" }],
        translations: { en: { title: "Mine", description: "" } },
      })
    );

    try {
      const image = await fetch(new URL("/screenshots/0.png", server.setUrl));
      expect(image.status).toBe(404);
    } finally {
      await rm(outside, { force: true });
    }
  });
});
