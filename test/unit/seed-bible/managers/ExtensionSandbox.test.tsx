// Real i18next isn't initialized in unit tests; the manager only needs to
// register translations and read the language.
vi.mock(
  "@packages/seed-bible/seed-bible/i18n/I18nManager",
  async (original) => ({
    ...(await original<object>()),
    addTranslations: vi.fn(),
    i18n: { language: "en", on: () => {} },
  })
);
import { render } from "preact";
import { useEffect } from "preact/hooks";
import {
  buildSandboxCsp,
  buildSandboxDocument,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxManager";
import {
  extensionSource,
  mergeExtensionGrants,
  missingFromGrant,
  parseSandboxManifest,
} from "@packages/seed-bible/seed-bible/managers/ExtensionPermissions";
import {
  defineExtension,
  SandboxError,
  type SandboxContext,
} from "@packages/seed-bible/seed-bible/extensions";
import { sha384, useSandboxHarness } from "./sandboxHarness";

describe("sandboxed extensions", () => {
  const h = useSandboxHarness();
  const { createManager, publish, reload, setUserActivation } = h;

  it("asks before installing, and runs nothing when the user declines", async () => {
    h.consent.mockResolvedValue(false);
    const main = vi.fn();
    const extension = await publish(defineExtension({ main }), {
      id: "ext.declined",
      permissions: ["reading:position"],
      network: ["api.example.com"],
    });

    const installed = await createManager().loadExtension(extension);

    expect(installed).toBe(false);
    expect(h.consent).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionId: "ext.declined",
        title: "Title of ext.declined",
        sourceHost: "files.example.com",
        permissions: ["reading:position"],
        network: ["api.example.com"],
        reason: "install",
      })
    );
    expect(h.frames).toEqual([]);
    expect(main).not.toHaveBeenCalled();
  });

  it("runs an approved extension in its own frame, under ids the app's tools can't collide with", async () => {
    const extension = await publish(
      defineExtension({
        main: async (sb) => {
          await sb.tools.registerToolbarTool({
            id: "share",
            title: "Open demo",
            icon: { material: "star" },
            onSelect: () =>
              void sb.panes.open({
                view: "main",
                placement: "side",
                title: "Demo",
                props: { greeting: "hi" },
              }),
          });
        },
        views: { main: ({ props }) => <p>{JSON.stringify(props)}</p> },
      }),
      { id: "ext.demo" }
    );

    expect(await createManager().loadExtension(extension)).toBe(true);
    await vi.waitFor(() =>
      expect([...h.host.surfaces.toolbar.keys()]).toEqual([
        "sandbox:ext.demo:share",
      ])
    );
    expect(h.frames).toHaveLength(1);
    expect(h.frames[0]!.init.mode).toEqual({ kind: "background" });

    h.host.surfaces.toolbar.get("sandbox:ext.demo:share")!.onSelect!();
    await vi.waitFor(() => expect(h.host.panes.panes.value).toHaveLength(1));
    const pane = h.host.panes.panes.value[0]!;
    expect(pane.id).toMatch(/^sandbox:ext\.demo:/);

    // Rendering the pane is what connects its view frame.
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(pane.component(), container);
    await vi.waitFor(() => expect(h.frames).toHaveLength(2));
    expect(h.frames[1]!.init.mode).toEqual({
      kind: "view",
      view: "main",
      paneId: pane.id,
      props: { greeting: "hi" },
    });
    render(null, container);
    container.remove();
  });

  it("doesn't ask again for an extension the user already approved", async () => {
    const extension = await publish(defineExtension({}), {
      id: "ext.remembered",
      permissions: ["reading:position"],
    });
    await createManager().loadExtension(extension);
    reload("ext.remembered");

    expect(await createManager().loadExtension(extension)).toBe(true);

    expect(h.consent).toHaveBeenCalledTimes(1);
  });

  it("asks again, listing only what's new, when an update wants more", async () => {
    const first = await publish(defineExtension({}), {
      id: "ext.growing",
      permissions: ["reading:position"],
    });
    await createManager().loadExtension(first);
    reload("ext.growing");

    const update = await publish(defineExtension({}), {
      id: "ext.growing",
      permissions: ["reading:position", "reading:selection"],
      network: ["api.example.com"],
    });
    await createManager().loadExtension(update);

    expect(h.consent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: "update",
        newPermissions: ["reading:selection"],
        newNetwork: ["api.example.com"],
      })
    );
  });

  it("doesn't let another publisher's extension with the same id use an earlier grant", async () => {
    const original = await publish(defineExtension({}), {
      id: "ext.same-id",
      permissions: ["reading:position"],
    });
    await createManager().loadExtension(original);
    reload("ext.same-id");

    const impostor = await publish(
      defineExtension({}),
      { id: "ext.same-id", permissions: ["reading:position"] },
      "https://files.example.com/publisher-b/ext.same-id.js"
    );
    await createManager().loadExtension(impostor);

    expect(h.consent).toHaveBeenCalledTimes(2);
    expect(h.consent).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: "install" })
    );
  });

  it("refuses a bundle that doesn't match the hash its manifest pins", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const extension = await publish(defineExtension({}), {
      id: "ext.tampered",
      integrity: await sha384("some other code"),
    });

    expect(await createManager().loadExtension(extension)).toBe(false);
    expect(h.consent).not.toHaveBeenCalled();
    expect(h.frames).toEqual([]);
  });

  it("refuses a manifest asking for a permission this version doesn't know", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const extension = await publish(defineExtension({}), {
      id: "ext.future",
      permissions: ["highlights:read"],
    });

    expect(await createManager().loadExtension(extension)).toBe(false);
    expect(h.consent).not.toHaveBeenCalled();
  });

  it("can't install without a way to ask the user", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const extension = await publish(defineExtension({}), { id: "ext.no-ui" });

    const manager = createManager({ requestSandboxConsent: undefined });

    expect(await manager.loadExtension(extension)).toBe(false);
    expect(h.frames).toEqual([]);
  });

  it("labels its toasts with the extension's name", async () => {
    await createManager().loadExtension(
      await publish(
        defineExtension({
          main: (sb) => sb.app.toast("Saved!"),
        }),
        { id: "ext.toaster" }
      )
    );

    await vi.waitFor(() =>
      expect(h.host.toasts).toEqual(["Title of ext.toaster: Saved!"])
    );
  });

  it("rejects tool definitions the host won't render", async () => {
    let error: unknown = null;
    await createManager().loadExtension(
      await publish(
        defineExtension({
          main: async (sb) => {
            error = await sb.tools
              .registerToolbarTool({
                id: "bad",
                title: "Bad",
                icon: { svg: "<script>alert(1)</script>" },
              })
              .catch((err: unknown) => err);
          },
        }),
        { id: "ext.bad-icon" }
      )
    );

    await vi.waitFor(() => expect(error).toBeInstanceOf(SandboxError));
    expect((error as SandboxError).code).toBe("invalid_request");
    expect(h.host.surfaces.toolbar.size).toBe(0);
  });

  it("only lets the extension's main code register tools, not its views", async () => {
    let viewError: unknown = null;
    const container = document.createElement("div");
    document.body.appendChild(container);
    function View({ sb }: { sb: SandboxContext }) {
      useEffect(() => {
        sb.tools
          .registerToolbarTool({
            id: "from-view",
            title: "From view",
            icon: { material: "star" },
          })
          .catch((err: unknown) => {
            viewError = err;
          });
      }, []);
      return null;
    }
    await createManager().loadExtension(
      await publish(
        defineExtension({
          main: (sb) =>
            void sb.panes.open({ view: "main", placement: "side", title: "V" }),
          views: { main: View },
        }),
        { id: "ext.view-tools" }
      )
    );
    await vi.waitFor(() => expect(h.host.panes.panes.value).toHaveLength(1));
    render(h.host.panes.panes.value[0]!.component(), container);

    await vi.waitFor(() => expect(viewError).toBeInstanceOf(SandboxError));
    expect((viewError as SandboxError).code).toBe("invalid_request");
    expect(h.host.surfaces.toolbar.size).toBe(0);
    render(null, container);
    container.remove();
  });

  it("keeps storage per extension, within a size limit", async () => {
    const results: Record<string, unknown> = {};
    const manager = createManager();
    for (const id of ["ext.store-a", "ext.store-b"]) {
      await manager.loadExtension(
        await publish(
          defineExtension({
            main: async (sb) => {
              if (id === "ext.store-a") {
                await sb.storage.set("note", "from a");
              }
              results[id] = await sb.storage.get("note");
              const big = "x".repeat(200 * 1024);
              await sb.storage.set("big-1", big);
              results[`${id}:limit`] = await sb.storage
                .set("big-2", big)
                .catch((err: SandboxError) => err.code);
            },
          }),
          { id }
        )
      );
    }

    await vi.waitFor(() => expect(Object.keys(results)).toHaveLength(4));
    expect(results["ext.store-a"]).toBe("from a");
    expect(results["ext.store-b"]).toBeNull();
    expect(results["ext.store-a:limit"]).toBe("limit_exceeded");
  });

  it("removes everything on uninstall, and asks again on the next install", async () => {
    const extension = await publish(
      defineExtension({
        main: async (sb) => {
          await sb.storage.set("kept", true);
          await sb.tools.registerQuickTool({
            id: "quick",
            title: "Quick",
            icon: { material: "bolt" },
          });
          await sb.panes.open({ view: "v", placement: "floating", title: "P" });
        },
      }),
      { id: "ext.uninstalled" }
    );
    const manager = createManager();
    await manager.loadExtension(extension);
    await vi.waitFor(() => expect(h.host.panes.panes.value).toHaveLength(1));
    expect(h.host.surfaces.quick.size).toBe(1);

    manager.unloadExtension("ext.uninstalled");

    expect(h.host.surfaces.quick.size).toBe(0);
    expect(h.host.panes.panes.value).toEqual([]);
    expect(h.frames).toEqual([]);
    expect(
      localStorage.getItem("sb-sandbox-storage:ext.uninstalled")
    ).toBeNull();

    await vi.waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("sb-extension-grants")!)[
          "ext.uninstalled"
        ]
      ).toHaveProperty("revokedAtMs")
    );
    await manager.loadExtension(extension);
    expect(h.consent).toHaveBeenCalledTimes(2);
  });

  it("doesn't let a published extension take a first-party extension's id, or the app's", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const manager = createManager();
    const firstParty = {
      import: async () => ({ default: () => {} }),
      meta: {
        id: "ext.first-party",
        translations: { en: { title: "Real", description: "" } },
      },
    };
    await manager.loadExtensionSet(
      { id: "bundled", extensions: [firstParty] },
      () => false
    );
    const impostor = await publish(defineExtension({}), {
      id: "ext.first-party",
    });
    const appNamespace = await publish(defineExtension({}), {
      id: "seed-bible",
    });

    await manager.loadExtensionSet(
      { id: "published", extensions: [impostor, appNamespace] },
      () => false
    );

    const ids = manager.getExtensions().map((entry) => entry.id);
    expect(ids).not.toContain("seed-bible");
    expect(
      manager.getExtensions().find((entry) => entry.id === "ext.first-party")
        ?.extension
    ).toBe(firstParty);
    expect(await manager.loadExtension(impostor)).toBe(false);
    expect(await manager.loadExtension(appNamespace)).toBe(false);
    expect(h.consent).not.toHaveBeenCalled();
  });

  describe("optional permissions", () => {
    /**
     * An extension whose toolbar tool asks for `reading:position` when
     * selected, recording what came back.
     */
    function askingOnSelect(results: unknown[], sbs: SandboxContext[] = []) {
      return defineExtension({
        main: async (sb) => {
          sbs.push(sb);
          await sb.tools.registerToolbarTool({
            id: "ask",
            title: "Ask",
            icon: { material: "lock_open" },
            onSelect: async () => {
              results.push(
                await sb.permissions
                  .request("reading:position")
                  .catch((err: SandboxError) => err.code)
              );
            },
          });
        },
      });
    }

    const clickTool = async (id: string) => {
      await vi.waitFor(() =>
        expect(h.host.surfaces.toolbar.has(`sandbox:${id}:ask`)).toBe(true)
      );
      h.host.surfaces.toolbar.get(`sandbox:${id}:ask`)!.onSelect!();
    };

    it("asks only for the required ones at install, and mentions the rest", async () => {
      const sbs: SandboxContext[] = [];
      await createManager().loadExtension(
        await publish(askingOnSelect([], sbs), {
          id: "ext.optional",
          permissions: ["reading:selection"],
          optionalPermissions: ["reading:position", "reading:selection"],
        })
      );

      expect(h.consent).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "install",
          permissions: ["reading:selection"],
          // Also listed as required, so it isn't optional.
          optionalPermissions: ["reading:position"],
        })
      );
      await vi.waitFor(() => expect(sbs).toHaveLength(1));
      expect(sbs[0]!.permissions.granted.value).toEqual(["reading:selection"]);
      expect(sbs[0]!.permissions.optional).toEqual(["reading:position"]);
      expect(sbs[0]!.reading.position.value).toBeNull();
    });

    it("grants one when the user agrees, right after using the extension, and keeps it on reload", async () => {
      const results: unknown[] = [];
      const sbs: SandboxContext[] = [];
      const extension = await publish(askingOnSelect(results, sbs), {
        id: "ext.asks",
        optionalPermissions: ["reading:position"],
      });
      await createManager().loadExtension(extension);

      setUserActivation(true);
      await clickTool("ext.asks");

      await vi.waitFor(() => expect(results).toEqual([true]));
      expect(h.consent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          reason: "request",
          extensionId: "ext.asks",
          permissions: ["reading:position"],
        })
      );
      // Visible to the extension as soon as its request resolves.
      expect(sbs[0]!.permissions.has("reading:position")).toBe(true);
      await vi.waitFor(() =>
        expect(sbs[0]!.reading.position.value).toEqual({
          translationId: "BSB",
          bookId: "JHN",
          chapterNumber: 3,
        })
      );

      reload("ext.asks");
      await createManager().loadExtension(extension);
      await vi.waitFor(() => expect(sbs).toHaveLength(2));
      expect(sbs[1]!.permissions.has("reading:position")).toBe(true);
      expect(h.consent).toHaveBeenCalledTimes(2);
    });

    it("doesn't ask without the user interacting with the extension", async () => {
      let sb: SandboxContext | null = null;
      await createManager().loadExtension(
        await publish(
          defineExtension({
            main: (context) => {
              sb = context;
            },
          }),
          { id: "ext.pushy-asker", optionalPermissions: ["reading:position"] }
        )
      );
      await vi.waitFor(() => expect(sb).toBeTruthy());
      h.consent.mockClear();

      // A click somewhere in the app, but not on this extension.
      setUserActivation(true);
      const error = await sb!.permissions
        .request("reading:position")
        .catch((err: unknown) => err);

      expect((error as SandboxError).code).toBe("invalid_request");
      expect(h.consent).not.toHaveBeenCalled();
    });

    it("asks when the user is inside one of the extension's panes", async () => {
      const results: unknown[] = [];
      const container = document.createElement("div");
      document.body.appendChild(container);
      await createManager().loadExtension(
        await publish(
          defineExtension({
            main: (sb) =>
              void sb.panes.open({
                view: "main",
                placement: "side",
                title: "V",
              }),
            views: {
              main: ({ sb }) => (
                <button
                  id="enable"
                  onClick={async () =>
                    results.push(
                      await sb.permissions.request("reading:position")
                    )
                  }
                />
              ),
            },
          }),
          { id: "ext.pane-asker", optionalPermissions: ["reading:position"] }
        )
      );
      await vi.waitFor(() => expect(h.host.panes.panes.value).toHaveLength(1));
      render(h.host.panes.panes.value[0]!.component(), container);
      await vi.waitFor(() => expect(h.frames).toHaveLength(2));

      h.focusedFrame = h.frames[1]!;
      setUserActivation(true);
      (document.getElementById("enable") as HTMLButtonElement).click();

      await vi.waitFor(() => expect(results).toEqual([true]));
      render(null, container);
      container.remove();
    });

    it("stops asking after the user says no", async () => {
      h.consent.mockImplementation(
        async (request) => request.reason !== "request"
      );
      const results: unknown[] = [];
      await createManager().loadExtension(
        await publish(askingOnSelect(results), {
          id: "ext.declined-optional",
          optionalPermissions: ["reading:position"],
        })
      );
      setUserActivation(true);

      await clickTool("ext.declined-optional");
      await vi.waitFor(() => expect(results).toEqual([false]));
      await clickTool("ext.declined-optional");
      await vi.waitFor(() => expect(results).toEqual([false, false]));

      expect(
        h.consent.mock.calls.filter(([request]) => request.reason === "request")
      ).toHaveLength(1);
    });

    it("refuses a request for a permission the manifest doesn't list as optional", async () => {
      const results: unknown[] = [];
      await createManager().loadExtension(
        await publish(askingOnSelect(results), { id: "ext.undeclared" })
      );
      setUserActivation(true);

      await clickTool("ext.undeclared");

      await vi.waitFor(() => expect(results).toEqual(["invalid_request"]));
      expect(h.consent).toHaveBeenCalledTimes(1);
    });

    it("keeps a granted optional permission through an update that asks for more", async () => {
      const results: unknown[] = [];
      const sbs: SandboxContext[] = [];
      await createManager().loadExtension(
        await publish(askingOnSelect(results, sbs), {
          id: "ext.updated",
          optionalPermissions: ["reading:position"],
        })
      );
      setUserActivation(true);
      await clickTool("ext.updated");
      await vi.waitFor(() => expect(results).toEqual([true]));
      reload("ext.updated");

      await createManager().loadExtension(
        await publish(askingOnSelect(results, sbs), {
          id: "ext.updated",
          permissions: ["reading:navigate"],
          optionalPermissions: ["reading:position", "reading:selection"],
        })
      );

      expect(h.consent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          reason: "update",
          newPermissions: ["reading:navigate"],
          optionalPermissions: ["reading:selection"],
        })
      );
      await vi.waitFor(() => expect(sbs).toHaveLength(2));
      expect([...sbs[1]!.permissions.granted.value].sort()).toEqual([
        "reading:navigate",
        "reading:position",
      ]);
    });
  });

  it("never auto-installs a sandboxed extension, even when it asks to be", async () => {
    const extension = await publish(defineExtension({}), {
      id: "ext.pushy",
      autoinstall: true,
    });
    const manager = createManager({
      defaultExtensions: { id: "defaults", extensions: [extension] },
    });

    await manager.loadDefaultExtensions();

    expect(h.consent).not.toHaveBeenCalled();
    expect(
      manager.getExtensions().find((entry) => entry.id === "ext.pushy")
        ?.installed
    ).toBe(false);
  });

  it("only offers a sandboxed extension named in an autoinstall link", async () => {
    h.consent.mockResolvedValue(false);
    const extension = await publish(defineExtension({}), { id: "ext.linked" });
    window.history.replaceState(null, "", "/?autoinstall-ext.linked=true");
    try {
      const manager = createManager({
        defaultExtensions: { id: "defaults", extensions: [extension] },
      });

      await manager.loadDefaultExtensions();

      expect(h.consent).toHaveBeenCalledWith(
        expect.objectContaining({ extensionId: "ext.linked" })
      );
      expect(
        manager.getExtensions().find((entry) => entry.id === "ext.linked")
          ?.installed
      ).toBe(false);
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});

describe("parseSandboxManifest()", () => {
  const integrity = "sha384-AAAA";

  it("normalizes hosts and drops duplicates", () => {
    expect(
      parseSandboxManifest({
        integrity,
        version: "1.0.0",
        permissions: ["reading:position", "reading:position"],
        network: ["API.Example.com:443", "api.example.com"],
      })
    ).toEqual({
      ok: true,
      manifest: {
        version: "1.0.0",
        permissions: ["reading:position"],
        optionalPermissions: [],
        network: ["api.example.com"],
        integrity,
      },
    });
  });

  it("treats a permission listed as both required and optional as required", () => {
    const result = parseSandboxManifest({
      integrity,
      permissions: ["reading:position"],
      optionalPermissions: ["reading:position", "reading:navigate"],
    });
    expect(result.ok && result.manifest).toMatchObject({
      permissions: ["reading:position"],
      optionalPermissions: ["reading:navigate"],
    });
  });

  it.each([
    [{ integrity, optionalPermissions: ["everything"] }, "everything"],
    [{}, "integrity"],
    [{ integrity: "md5-abc" }, "integrity"],
    [{ integrity, permissions: ["everything"] }, "everything"],
    [{ integrity, network: ["https://api.example.com"] }, "network"],
    [{ integrity, network: ["a.com; script-src *"] }, "network"],
    [{ integrity, dependencies: ["other"] }, "dependencies"],
  ])("rejects %j", (meta, mentioned) => {
    const result = parseSandboxManifest(meta);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(mentioned);
  });
});

describe("extension grants", () => {
  const grant = {
    permissions: ["reading:position" as const],
    network: ["api.example.com"],
    version: "1",
    source: "https://files.example.com/a/",
    grantedAtMs: 100,
  };

  it("keeps whichever of a grant and a revocation happened last", () => {
    expect(
      mergeExtensionGrants({ x: grant }, { x: { revokedAtMs: 200 } })
    ).toEqual({ x: { revokedAtMs: 200 } });
    expect(
      mergeExtensionGrants({ x: { revokedAtMs: 50 } }, { x: grant })
    ).toEqual({ x: grant });
  });

  it("covers nothing for a bundle from another source", () => {
    const manifest = {
      version: "1",
      permissions: ["reading:position" as const],
      optionalPermissions: [],
      network: [],
      integrity: "sha384-AAAA",
    };
    expect(
      missingFromGrant(grant, manifest, "https://files.example.com/a/")
    ).toEqual({ permissions: [], network: [] });
    expect(
      missingFromGrant(grant, manifest, "https://files.example.com/b/")
    ).toEqual({ permissions: ["reading:position"], network: [] });
  });

  it("identifies a source by the bundle's directory", () => {
    expect(extensionSource("https://files.example.com/a/b/c.js?v=1")).toBe(
      "https://files.example.com/a/b/"
    );
  });
});

describe("the sandbox frame's document", () => {
  it("only lets the frame reach the hosts it declared", () => {
    expect(buildSandboxCsp([])).toContain("connect-src 'none'");
    const csp = buildSandboxCsp(["api.example.com"]);
    expect(csp).toContain("connect-src https://api.example.com");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-src 'none'");
  });

  it("puts the policy in the document before any script", () => {
    const html = buildSandboxDocument(["api.example.com"]);
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(
      html.indexOf("<script>")
    );
  });
});
