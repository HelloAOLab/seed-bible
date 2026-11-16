// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { RESOLVED_ID } from "../../../../script/lib/extensionsModule";
import { MAX_ICON_BYTES } from "../../../../script/lib/extensionMedia";

let dir: string;
beforeEach(async () => {
  vi.resetModules();
  dir = await mkdtemp(path.join(tmpdir(), "extension-plugin-"));
  vi.stubEnv("SEED_BIBLE_EXTRA_EXTENSION_DIRS", dir);
  await writeFile(path.join(dir, "index.ts"), "export default () => {};");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

async function fixture(media: Record<string, unknown>) {
  await writeFile(
    path.join(dir, "extension.json"),
    JSON.stringify({
      id: "fixture-extension",
      translations: { en: { title: "Fixture", description: "Fixture" } },
      ...media,
    })
  );
}

async function loader() {
  const { extensionsPlugin } =
    await import("../../../../script/lib/vite-plugin-extensions");
  const hook = extensionsPlugin().load;
  if (!hook) throw new Error("Missing load hook");
  const load = typeof hook === "function" ? hook : hook.handler;
  const context = {
    addWatchFile: vi.fn<(file: string) => void>(),
    error(message: string): never {
      throw new Error(message);
    },
  };
  return { context, load: () => Reflect.apply(load, context, [RESOLVED_ID]) };
}

describe("extensions plugin media", () => {
  it.each([
    { icon: "missing.png" },
    { screenshots: [{ src: "missing.webp" }] },
    { screenshots: "malformed" },
  ])("fails the load hook naming the extension for %j", async (media) => {
    await fixture(media);
    const { load } = await loader();
    await expect(load()).rejects.toThrow(
      /\[extensions\] fixture-extension:.*\n.*(missing|must be a list)/
    );
  });

  it("bundles and watches referenced files and rechecks replacements", async () => {
    await fixture({ icon: "icon.svg", screenshots: [{ src: "shot.png" }] });
    await writeFile(path.join(dir, "icon.svg"), "<svg/>");
    await writeFile(path.join(dir, "shot.png"), "image");
    const { load, context } = await loader();
    const source = await load();
    expect(source).toContain(`${dir}/icon.svg?url`);
    expect(source).toContain(`${dir}/shot.png?url`);
    for (const file of ["extension.json", "icon.svg", "shot.png"]) {
      expect(context.addWatchFile).toHaveBeenCalledWith(path.join(dir, file));
    }

    await writeFile(path.join(dir, "icon.svg"), Buffer.alloc(MAX_ICON_BYTES));
    vi.resetModules();
    const fresh = await loader();
    await expect(fresh.load()).rejects.toThrow(
      /fixture-extension:\n.*icon.svg.*256 KB/
    );
  });
});
