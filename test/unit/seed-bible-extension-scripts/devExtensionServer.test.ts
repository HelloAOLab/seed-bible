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
});
