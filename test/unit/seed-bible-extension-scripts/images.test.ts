// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { checkPermissions } from "@packages/seed-bible-extension-scripts/src/commands/check";
import path from "node:path";
import {
  checkIcon,
  checkImages,
  readIcon,
  readScreenshots,
  SCREENSHOT_TYPES,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
} from "@packages/seed-bible-extension-scripts/src/lib/images";
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

  // No file is written: Windows can't name one with a ?, and the check refuses
  // the name before it looks at the disk.
  it.each(["#", "?"])(
    "rejects %s in local media filenames",
    async (character) => {
      const src = `shot${character}1.png`;
      expect(
        await checkImages(root, { ...meta(src), screenshots: [{ src }] })
      ).toEqual([
        expect.stringMatching(/must not contain.*[?#]/),
        expect.stringMatching(/must not contain.*[?#]/),
      ]);
    }
  );

  it("refuses an icon outside the project before packaging", async () => {
    const project = path.join(root, "project");
    await mkdir(project);
    await writeFile(path.join(root, "logo.png"), new Uint8Array(100));

    expect(await checkImages(project, meta("../logo.png"))).toEqual([
      '"icon" is ../logo.png, but must name a file inside the project.',
    ]);
    expect(await readIcon(project, meta("../logo.png"))).toBeNull();
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

  it("refuses an icon exactly 256 KB", async () => {
    await writeFile(path.join(root, "icon.png"), new Uint8Array(256 * 1024));

    expect(await checkIcon(root, meta("icon.png"))).toEqual([
      '"icon" is 256 KB; keep it under 256 KB. A square image 256 pixels across is plenty.',
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

describe("checking and reading screenshot media", () => {
  let root: string;
  const meta = (screenshots?: unknown): ExtensionProjectMeta =>
    ({
      id: "example",
      translations: {
        en: { title: "Example", description: "", overview: "Overview" },
      },
      screenshots,
    }) as ExtensionProjectMeta;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "sb-images-"));
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it("accepts supported local files, HTTPS links and absent screenshots", async () => {
    const screenshots = Object.keys(SCREENSHOT_TYPES).map((ext) => ({
      src: `shot${ext.toUpperCase()}`,
      caption: "overview",
    }));
    for (const { src } of screenshots)
      await writeFile(
        path.join(root, src),
        new Uint8Array(MAX_SCREENSHOT_BYTES - 1)
      );
    screenshots.push({
      src: "https://cdn.example.com/shot.png",
      caption: "overview",
    });
    expect(await checkImages(root, meta())).toEqual([]);
    expect(await checkImages(root, meta([]))).toEqual([]);
    expect(await checkImages(root, meta(screenshots))).toEqual([]);
    const images = await readScreenshots(root, meta(screenshots));
    expect(images.map((image) => image?.mimeType ?? null)).toEqual([
      ...Object.values(SCREENSHOT_TYPES),
      null,
    ]);
    expect(images[0]?.bytes.byteLength).toBe(MAX_SCREENSHOT_BYTES - 1);
    expect(await readIcon(root, { ...meta(), icon: "shot.PNG" })).toMatchObject(
      { extension: ".png", mimeType: "image/png" }
    );
  });

  it("reports missing files, unsupported types and captions with clear messages", async () => {
    expect(
      await checkImages(
        root,
        meta([{ src: "missing.png" }, { src: "shot.svg", caption: "missing" }])
      )
    ).toEqual([
      `"screenshots[0]".src is missing.png, but there's no such file in the project.`,
      '"screenshots[1]".src is shot.svg, but it must be one of: .png, .webp, .jpg, .jpeg.',
      '"screenshots[1]".caption is "missing", but has no English text in translations.en.',
    ]);
  });

  it.each([0, 1, 1024 * 1024])(
    "rejects a screenshot at the limit plus %i bytes",
    async (extra) => {
      const size = MAX_SCREENSHOT_BYTES + extra;
      await writeFile(path.join(root, "shot.png"), new Uint8Array(size));
      expect(await checkImages(root, meta([{ src: "shot.png" }]))).toEqual([
        `"screenshots[0]".src is shot.png (${size} bytes); keep it under 1024 KB (1048576 bytes).`,
      ]);
    }
  );

  it("accepts eight screenshots and rejects nine", async () => {
    const screenshots = Array.from({ length: MAX_SCREENSHOTS }, () => ({
      src: "https://cdn.example.com/shot.png",
    }));
    expect(await checkImages(root, meta(screenshots))).toEqual([]);
    expect(
      await checkImages(root, meta([...screenshots, screenshots[0]]))
    ).toEqual(['"screenshots" has 9 entries; the limit is 8.']);
  });

  it.each([null, {}, "shot.png", 3])(
    "rejects malformed field %j",
    async (shots) => {
      expect(await checkImages(root, meta(shots))).toEqual([
        '"screenshots" must be a list.',
      ]);
    }
  );

  it.each([null, [], "shot.png"])(
    "rejects malformed entry %j",
    async (shot) => {
      expect(await checkImages(root, meta([shot]))).toEqual([
        '"screenshots[0]" must be an object with an image src and optional caption key.',
      ]);
    }
  );

  it.each([{}, { src: 3 }, { src: "" }])(
    "rejects malformed src %j",
    async (shot) => {
      expect(await checkImages(root, meta([shot]))).toEqual([
        '"screenshots[0]".src must be the path to an image in the project.',
      ]);
    }
  );

  it.each(["missing", "", "blank", "toString", 3])(
    "rejects caption without English text %j",
    async (caption) => {
      const value = meta([
        { src: "https://cdn.example.com/shot.png", caption },
      ]);
      value.translations.en!.blank = "  ";
      expect(await checkImages(root, value)).toEqual([
        `"screenshots[0]".caption is ${JSON.stringify(caption)}, but has no English text in translations.en.`,
      ]);
    }
  );

  it.each(["../outside.png", "/outside.png", "data:image/png;base64,AA"])(
    "rejects file outside the package: %s",
    async (src) => {
      expect(await checkImages(root, meta([{ src }]))).toEqual([
        `"screenshots[0]".src is ${src}, but must name a file inside the project.`,
      ]);
    }
  );

  it("rejects insecure hosted screenshots", async () => {
    expect(
      await checkImages(
        root,
        meta([{ src: "http://cdn.example.com/shot.png" }])
      )
    ).toEqual([
      '"screenshots[0]".src is http://cdn.example.com/shot.png, but Seed Bible only shows screenshots from https: links.',
    ]);
  });
  it("makes check return 1 and print all screenshot problems", async () => {
    await writeFile(
      path.join(root, "index.ts"),
      'import { defineExtension } from "seed-bible/extensions";'
    );
    await writeFile(
      path.join(root, "extension.json"),
      JSON.stringify(meta([{ src: "missing.png", caption: "missing" }]))
    );
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await checkPermissions(root)).toBe(1);
      expect(errors.mock.calls.map(([message]) => message)).toEqual([
        `[check] "screenshots[0]".src is missing.png, but there's no such file in the project.`,
        '[check] "screenshots[0]".caption is "missing", but has no English text in translations.en.',
      ]);
    } finally {
      errors.mockRestore();
    }
  });
});
