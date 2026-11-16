// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionProjectMeta } from "@packages/seed-bible-extension-scripts/src/lib/project";
import { MAX_SCREENSHOTS as RUNTIME_MAX_SCREENSHOTS } from "@packages/seed-bible/seed-bible/extensions/mediaLimits";
import * as app from "../../../script/lib/extensionMedia";
import * as scripts from "@packages/seed-bible-extension-scripts/src/lib/images";

it("keeps the published toolkit media limits aligned with the app build", () => {
  expect(RUNTIME_MAX_SCREENSHOTS).toBe(app.MAX_SCREENSHOTS);
  for (const name of [
    "ICON_TYPES",
    "SCREENSHOT_TYPES",
    "MAX_ICON_BYTES",
    "MAX_SCREENSHOT_BYTES",
    "MAX_SCREENSHOTS",
  ] as const) {
    expect(scripts[name], name).toEqual(app[name]);
  }
});

it("keeps local media validation aligned across the app and published toolkit", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sb-media-parity-"));
  try {
    await writeFile(path.join(root, "shot.png"), "image");
    await writeFile(path.join(root, "shot.svg"), "image");
    await writeFile(
      path.join(root, "large.png"),
      Buffer.alloc(app.MAX_SCREENSHOT_BYTES)
    );
    await mkdir(path.join(root, "folder.png"));
    const translations = {
      en: {
        title: "Example",
        description: "",
        overview: "Overview",
        blank: "  ",
      },
    };
    const fixtures: {
      name: string;
      media: {
        icon?: unknown;
        screenshots?: unknown;
        translations?: Record<string, Record<string, unknown>>;
      };
      rejected: boolean;
    }[] = [
      { name: "no media", media: {}, rejected: false },
      {
        name: "empty screenshots",
        media: { screenshots: [] },
        rejected: false,
      },
      { name: "local icon", media: { icon: "shot.png" }, rejected: false },
      ...[undefined, "overview", "missing", "blank", "toString", "", 3].map(
        (caption) => ({
          name: `caption ${String(caption)}`,
          media: { screenshots: [{ src: "shot.png", caption }], translations },
          rejected: caption !== undefined && caption !== "overview",
        })
      ),
      ...[
        "../outside.png",
        "/outside.png",
        "missing.png",
        "shot.svg",
        "large.png",
        "folder.png",
      ].map((src) => ({
        name: `screenshot ${src}`,
        media: { screenshots: [{ src }] },
        rejected: true,
      })),
      {
        name: "icon outside project",
        media: { icon: "../outside.png" },
        rejected: true,
      },
      ...[8, 9].map((count) => ({
        name: `${count} screenshots`,
        media: {
          screenshots: Array.from({ length: count }, () => ({
            src: "shot.png",
          })),
        },
        rejected: count > 8,
      })),
      ...[null, {}, "shot.png", 3].map((screenshots) => ({
        name: `malformed list ${JSON.stringify(screenshots)}`,
        media: { screenshots },
        rejected: true,
      })),
      ...[null, [], "shot.png", {}, { src: 3 }, { src: "" }].map((shot) => ({
        name: `malformed entry ${JSON.stringify(shot)}`,
        media: { screenshots: [shot] },
        rejected: true,
      })),
    ];
    const rejected = { app: [] as string[], scripts: [] as string[] };
    for (const fixture of fixtures) {
      const meta = { id: "example", translations, ...fixture.media };
      const appMessages = await app.checkExtensionMedia(root, meta);
      // Malformed manifests exercise the runtime validation beyond the declared type.
      const scriptMessages = await scripts.checkImages(
        root,
        meta as ExtensionProjectMeta
      );
      if (appMessages.length) rejected.app.push(fixture.name);
      if (scriptMessages.length) rejected.scripts.push(fixture.name);
    }
    const expected = fixtures
      .filter((fixture) => fixture.rejected)
      .map((fixture) => fixture.name);
    expect(rejected.app).toEqual(expected);
    expect(rejected.scripts).toEqual(rejected.app);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
