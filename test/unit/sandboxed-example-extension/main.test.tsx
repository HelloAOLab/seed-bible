import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createTestHost,
  type TestHost,
  type TestHostOptions,
} from "@packages/seed-bible/seed-bible/extensions/testing";
import {
  checkManifestPermissions,
  checkPermissionUses,
  findPermissionUses,
} from "@packages/seed-bible-extension-scripts/src/lib/manifestPolicy";
import { readProjectSources } from "@packages/seed-bible-extension-scripts/src/lib/sandboxedProject";
import { isSandboxedExtensionDir } from "../../../script/lib/vite-plugin-extensions";
import extension from "@packages/sandboxed-example-extension/src/main";

/*
 * The example extension, ported to the sandbox. These run it the way the
 * app would, and check what it offers matches the original.
 */
const root = path.resolve("packages/sandboxed-example-extension");
const manifest = JSON.parse(
  await readFile(path.join(root, "extension.json"), "utf-8")
);

describe("sandboxed example extension", () => {
  let host: TestHost;
  afterEach(() => host?.dispose());

  async function start(options: TestHostOptions = {}) {
    host = await createTestHost(extension, {
      extensionId: manifest.id,
      granted: manifest.permissions,
      optional: manifest.optionalPermissions,
      state: { strings: manifest.translations.en },
      ...options,
    });
    await host.ready;
    return host;
  }

  it("adds the same tools as the original", async () => {
    await start();

    expect(
      [...host.tools.values()].map((tool) => [tool.id, tool.surface])
    ).toEqual([
      ["my-example-tool", "toolbar"],
      ["my-verse-tool", "verse"],
      ["my-below-reader-tool", "belowReader"],
      ["open-grid-portal", "toolbar"],
      ["open-map-portal", "toolbar"],
    ]);
    expect(host.tools.get("my-verse-tool")!.items!.map((i) => i.id)).toEqual([
      "item-1",
      "item-2",
    ]);
  });

  it("cross-references the first chapters of Genesis and John in Discover", async () => {
    await start();
    const ask = (bookId: string, chapter: number) =>
      host.discover("example-discover-provider", {
        translationId: "BSB",
        bookId,
        chapter,
        language: "en",
      });

    expect(await ask("JHN", 1)).toEqual([
      {
        type: "cross-reference",
        reference: { bookId: "JHN", chapter: 1, verse: 1 },
        crossReference: { bookId: "GEN", chapter: 1, verse: 1 },
      },
    ]);
    expect(await ask("GEN", 1)).toHaveLength(1);
    expect(await ask("JHN", 2)).toEqual([]);
  });

  it("toasts from the verse tool's items", async () => {
    await start();

    await host.selectTool("my-verse-tool", { itemId: "item-2" });

    expect(host.toasts).toEqual(["Item 2 clicked!"]);
  });

  it("shows the greeting from its settings, and sends the sensitive request", async () => {
    await start({
      settings: { greeting: "Hi", repeatCount: 2, showBanner: true },
      answers: {
        "sensitive.fetch": () => ({
          status: 200,
          ok: true,
          contentType: "application/json",
          body: "{}",
        }),
      },
    });
    await host.selectTool("my-example-tool");
    expect([...host.panes.values()]).toEqual([
      expect.objectContaining({ view: "greeting" }),
    ]);

    const pane = await host.renderView("greeting");
    await vi.waitFor(() => expect(pane.textContent).toContain("HiHi"));
    expect(pane.textContent).toContain(
      manifest.translations.en["example-banner"]
    );
    pane.querySelector("button")!.click();

    await vi.waitFor(() =>
      expect(host.toasts).toEqual(["Example service: 200"])
    );
    expect(
      host.calls.find((c) => c.method === "sensitive.fetch")!.params
    ).toEqual({
      url: "https://httpbin.org/post",
      method: "POST",
      body: { hello: "world" },
    });
  });

  it("asks before showing a portal, and both portals share one pane", async () => {
    await start();

    await host.selectTool("open-grid-portal");
    await host.selectTool("open-map-portal");

    expect(host.requests).toEqual([
      { permissions: ["embed:casualos"], granted: true },
    ]);
    expect([...host.panes.values()]).toEqual([
      expect.objectContaining({
        paneId: "sandbox:sandboxed-example-extension:example-portal-pane",
        options: expect.objectContaining({ portalType: "map" }),
      }),
    ]);
  });

  it("says why there's no portal when the user declines", async () => {
    await start({ allowRequests: false });

    await host.selectTool("open-grid-portal");

    expect(host.panes.size).toBe(0);
    expect(host.toasts).toEqual([
      manifest.translations.en["portal-permission-declined"],
    ]);
  });

  it("declares exactly the permissions its code uses, and isn't bundled into the app", async () => {
    const sources = await readProjectSources(root);

    expect(checkManifestPermissions(manifest)).toEqual([]);
    expect(checkPermissionUses(manifest, findPermissionUses(sources))).toEqual({
      errors: [],
      warnings: [],
    });
    expect(await isSandboxedExtensionDir(root)).toBe(true);
    expect(
      await isSandboxedExtensionDir(
        path.resolve("packages/seed-bible-refresh-example-extension")
      )
    ).toBe(false);
  });
});
