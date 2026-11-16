// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkIcon } from "@packages/seed-bible-extension-scripts/src/lib/icon";
import type { ExtensionProjectMeta } from "@packages/seed-bible-extension-scripts/src/lib/project";

/*
 * `check` (which `build`, `package` and `publish` run) refuses an icon
 * Seed Bible couldn't show, before anything is uploaded.
 */
describe("checking an extension's icon", () => {
  let root: string;
  // As read from extension.json, where `icon` could be anything.
  const meta = (icon?: unknown) =>
    ({
      id: "verse-art",
      translations: { en: { title: "Verse Art", description: "" } },
      ...(icon !== undefined && { icon }),
    }) as ExtensionProjectMeta;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "sb-icon-"));
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it("accepts no icon, an image in the project, or an https: link", async () => {
    await writeFile(path.join(root, "icon.png"), new Uint8Array(100));

    expect(await checkIcon(root, meta())).toEqual([]);
    expect(await checkIcon(root, meta("icon.png"))).toEqual([]);
    expect(
      await checkIcon(root, meta("https://cdn.example.com/icon.png"))
    ).toEqual([]);
  });

  it("refuses a file that isn't there", async () => {
    expect(await checkIcon(root, meta("missing.png"))).toEqual([
      `"icon" is missing.png, but there's no such file in the project.`,
    ]);
  });

  it("refuses a file that isn't an image Seed Bible shows", async () => {
    await writeFile(path.join(root, "icon.bmp"), new Uint8Array(100));

    expect(await checkIcon(root, meta("icon.bmp"))).toEqual([
      `"icon" is icon.bmp, but it must be one of: .png, .svg, .webp, .jpg, .jpeg.`,
    ]);
  });

  it("refuses an icon over 256 KB", async () => {
    await writeFile(path.join(root, "icon.png"), new Uint8Array(300 * 1024));

    expect(await checkIcon(root, meta("icon.png"))).toEqual([
      `"icon" is 300 KB; keep it under 256 KB. A square image 256 pixels across is plenty.`,
    ]);
  });

  it("refuses a link that isn't https:, or a value that isn't a path", async () => {
    expect(
      await checkIcon(root, meta("http://cdn.example.com/icon.png"))
    ).toEqual([
      `"icon" is http://cdn.example.com/icon.png, but Seed Bible only shows icons from https: links.`,
    ]);
    expect(await checkIcon(root, meta(42))).toEqual([
      '"icon" must be the path to an image in your project, like "icon.png".',
    ]);
  });
});
