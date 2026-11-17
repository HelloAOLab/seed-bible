import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkExtensionMedia,
  ICON_TYPES,
  SCREENSHOT_TYPES,
  MAX_ICON_BYTES,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
} from "../../../../script/lib/extensionMedia";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "extension-media-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const translations = {
  en: { title: "Example", description: "Example", overview: "The overview" },
};

describe("checkExtensionMedia", () => {
  it("accepts absent media and an empty screenshot list", async () => {
    expect(await checkExtensionMedia(dir, {})).toEqual([]);
    expect(await checkExtensionMedia(dir, { screenshots: [] })).toEqual([]);
  });

  it("accepts every supported image type below the limits", async () => {
    for (const extension of Object.keys(ICON_TYPES)) {
      const icon = `icon${extension.toUpperCase()}`;
      await writeFile(path.join(dir, icon), Buffer.alloc(MAX_ICON_BYTES - 1));
      expect(await checkExtensionMedia(dir, { icon })).toEqual([]);
    }
    const screenshots = Object.keys(SCREENSHOT_TYPES).map((ext) => ({
      src: `shot${ext}`,
      caption: "overview",
    }));
    for (const { src } of screenshots) {
      await writeFile(
        path.join(dir, src),
        Buffer.alloc(MAX_SCREENSHOT_BYTES - 1)
      );
    }
    expect(
      await checkExtensionMedia(dir, { screenshots, translations })
    ).toEqual([]);
  });

  // No file is written: Windows can't name one with a ?, and the check refuses
  // the name before it looks at the disk.
  it.each(["#", "?"])(
    "rejects %s in local media filenames",
    async (character) => {
      const src = `shot${character}1.png`;
      expect(
        await checkExtensionMedia(dir, { icon: src, screenshots: [{ src }] })
      ).toEqual([
        expect.stringMatching(/must not contain.*[?#]/),
        expect.stringMatching(/must not contain.*[?#]/),
      ]);
    }
  );

  it("names missing files and rejects a directory as an image", async () => {
    await mkdir(path.join(dir, "folder.png"));
    const messages = await checkExtensionMedia(dir, {
      icon: "missing.svg",
      screenshots: [{ src: "missing.webp" }, { src: "folder.png" }],
    });
    expect(messages).toEqual([
      expect.stringMatching(/icon.*missing.svg.*no such file/),
      expect.stringMatching(/screenshots\[0\].*missing.webp.*no such file/),
      expect.stringMatching(/screenshots\[1\].*folder.png.*no such file/),
    ]);
  });

  it("reports unsupported types, including SVG screenshots", async () => {
    expect(
      await checkExtensionMedia(dir, {
        icon: "icon.gif",
        screenshots: [{ src: "shot.svg" }],
      })
    ).toEqual([
      expect.stringMatching(/icon.*icon.gif.*must be one of:.*\.svg/),
      expect.stringMatching(
        /screenshots\[0\].*shot.svg.*must be one of: \.png, \.webp, \.jpg, \.jpeg/
      ),
    ]);
  });

  it.each([0, 1])("rejects files at the limit plus %i bytes", async (extra) => {
    await writeFile(
      path.join(dir, "icon.png"),
      Buffer.alloc(MAX_ICON_BYTES + extra)
    );
    await writeFile(
      path.join(dir, "shot.jpg"),
      Buffer.alloc(MAX_SCREENSHOT_BYTES + extra)
    );
    expect(
      await checkExtensionMedia(dir, {
        icon: "icon.png",
        screenshots: [{ src: "shot.jpg" }],
      })
    ).toEqual([
      expect.stringContaining(
        `icon.png (${MAX_ICON_BYTES + extra} bytes); keep it under 256 KB`
      ),
      expect.stringContaining(
        `shot.jpg (${MAX_SCREENSHOT_BYTES + extra} bytes); keep it under 1024 KB`
      ),
    ]);
  });

  it("accepts eight screenshots and reports the limit for nine", async () => {
    await writeFile(path.join(dir, "shot.png"), "image");
    const screenshots = Array.from({ length: MAX_SCREENSHOTS }, () => ({
      src: "shot.png",
    }));
    expect(await checkExtensionMedia(dir, { screenshots })).toEqual([]);
    expect(
      await checkExtensionMedia(dir, {
        screenshots: [...screenshots, screenshots[0]],
      })
    ).toEqual(['"screenshots" has 9 entries; the limit is 8.']);
  });

  it.each(["missing", "", "blank", "number", "toString"])(
    "reports caption key %j without English text",
    async (caption) => {
      await writeFile(path.join(dir, "shot.png"), "image");
      const messages = await checkExtensionMedia(dir, {
        screenshots: [{ src: "shot.png", caption }],
        translations: {
          en: { blank: "  ", number: 7 },
          es: { missing: "Texto" },
        },
      });
      expect(messages).toEqual([
        expect.stringContaining(
          `"screenshots[0]".caption is ${JSON.stringify(caption)}, but has no English text`
        ),
      ]);
    }
  );

  it.each([null, {}, "shot.png", 3])(
    "rejects malformed screenshots field %j",
    async (screenshots) => {
      expect(await checkExtensionMedia(dir, { screenshots })).toEqual([
        '"screenshots" must be a list.',
      ]);
    }
  );

  it.each([null, [], "shot.png", {}, { src: 3 }, { src: "" }])(
    "rejects malformed entry %j",
    async (entry) => {
      expect(await checkExtensionMedia(dir, { screenshots: [entry] })).toEqual([
        expect.stringMatching(
          /screenshots\[0\].*(must be an object|must be the path)/
        ),
      ]);
    }
  );

  it.each([null, 3, ""])("rejects malformed icon %j", async (icon) => {
    expect(await checkExtensionMedia(dir, { icon })).toEqual([
      expect.stringMatching(/icon.*must be the path/),
    ]);
  });

  it.each(["../outside.png", "/outside.png", "https://example.com/shot.png"])(
    "rejects a built-in reference outside its package: %s",
    async (src) => {
      expect(
        await checkExtensionMedia(dir, { icon: src, screenshots: [{ src }] })
      ).toEqual([
        expect.stringMatching(/icon.*must name a file inside/),
        expect.stringMatching(/screenshots\[0\].*must name a file inside/),
      ]);
    }
  );
});
