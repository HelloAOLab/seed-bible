import { signal } from "@preact/signals";

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
  createExtensionManager,
  ExtensionInitalizer,
  setupExtensionContext,
  type ExtensionManagerOptions,
  type ExtensionMeta,
  type UploadedExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import {
  buildSandboxCsp,
  buildSandboxDocument,
  type SandboxFrameConnector,
  type SandboxFrameRequest,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxManager";
import {
  extensionSource,
  mergeExtensionGrants,
  missingFromGrant,
  parseSandboxManifest,
  type SandboxConsentRequest,
} from "@packages/seed-bible/seed-bible/managers/ExtensionPermissions";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type {
  BibleTool,
  ToolsManager,
} from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  defineExtension,
  SandboxError,
  type SandboxContext,
  type SandboxExtension,
} from "@packages/seed-bible/seed-bible/extensions";
import { SANDBOX_START_KEY } from "@packages/seed-bible/seed-bible/extensions/protocol";

type RegisteredTool = BibleTool<unknown> & {
  onSelect?: () => void;
  getItems?: () => { id: string; onSelect?: () => void }[];
};

/**
 * Stands in for the app's toolbars: records what's registered by id, with the
 * same replace-by-id rule as the real `ToolsManager`, so a test can see and
 * click what a toolbar would render.
 */
function createRecordingTools() {
  const surfaces = {
    toolbar: new Map<string, RegisteredTool>(),
    verse: new Map<string, RegisteredTool>(),
    quick: new Map<string, RegisteredTool>(),
    belowReader: new Map<string, RegisteredTool>(),
  };
  const register =
    (surface: keyof typeof surfaces) => (tool: RegisteredTool) => {
      surfaces[surface].set(tool.id, tool);
      return () => surfaces[surface].delete(tool.id);
    };
  const unregister = (surface: keyof typeof surfaces) => (id: string) => {
    surfaces[surface].delete(id);
  };
  const tools = {
    registerToolbarTool: register("toolbar"),
    unregisterToolbarTool: unregister("toolbar"),
    registerVerseToolbarTool: register("verse"),
    unregisterVerseToolbarTool: unregister("verse"),
    registerQuickTool: register("quick"),
    unregisterQuickTool: unregister("quick"),
    registerBelowReaderTool: register("belowReader"),
    unregisterBelowReaderTool: unregister("belowReader"),
  } as unknown as ToolsManager;
  return { tools, surfaces };
}

function createLogin(): LoginManager {
  return {
    userId: signal<string | null>(null),
    profile: signal(null),
    localConfig: signal<Record<string, unknown>>({}),
    profilePromise: null,
  } as unknown as LoginManager;
}

async function sha384(text: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-384", new TextEncoder().encode(text))
  );
  return `sha384-${btoa(String.fromCharCode(...digest))}`;
}

describe("sandboxed extensions", () => {
  // A "bundle" here is a token that names an extension definition; the
  // in-process connector below starts that definition the way the frame's
  // bootstrap would start the real module.
  const definitions = new Map<string, SandboxExtension>();
  const bundles = new Map<string, string>();
  let frames: SandboxFrameRequest[];
  let openPorts: MessagePort[];
  let nextBundle: number;
  let consent: ReturnType<
    typeof vi.fn<(r: SandboxConsentRequest) => Promise<boolean>>
  >;
  let host: ReturnType<typeof createHost>;

  const connector: SandboxFrameConnector = (request) => {
    frames.push(request);
    const channel = new MessageChannel();
    openPorts.push(channel.port1, channel.port2);
    const definition = definitions.get(request.code);
    if (definition) {
      void definition[SANDBOX_START_KEY](
        channel.port2,
        structuredClone(request.init)
      );
    }
    return {
      port: channel.port1,
      destroy: () => {
        frames = frames.filter((frame) => frame !== request);
        channel.port1.close();
        channel.port2.close();
      },
    };
  };

  function createHost() {
    const { tools, surfaces } = createRecordingTools();
    const panes = createPanes();
    const selectedVerses = signal<BibleSelectedVerse[]>([]);
    const reading = signal({
      tab: { readingState: { selectedVerses } },
      translationId: "BSB" as string | null,
      bookId: "JHN" as string | null,
      chapterNumber: 3 as number | null,
    });
    const toasts: string[] = [];
    const openedReferences: unknown[] = [];
    const context = {
      tools,
      panes,
      app: {
        toast: (message: string) => toasts.push(message),
        currentReadingState: reading,
        isMobile: signal(false),
        openVerseReference: async (ref: unknown) => {
          openedReferences.push(ref);
        },
      },
      theme: { themeCssVariables: signal("--sb-font-color: #111;") },
      i18n: { language: signal("en"), isRtl: signal(false) },
      extensionSettings: { getValue: () => undefined },
    };
    setupExtensionContext(context as unknown as SeedBibleState);
    return {
      surfaces,
      panes,
      reading,
      selectedVerses,
      toasts,
      openedReferences,
    };
  }

  function createManager(options: ExtensionManagerOptions = {}) {
    return createExtensionManager(createLogin(), {
      requestSandboxConsent: consent,
      sandboxFrameConnector: connector,
      ...options,
    });
  }

  async function publish(
    definition: SandboxExtension,
    meta: Partial<ExtensionMeta> & { id: string },
    url = `https://files.example.com/publisher-a/${meta.id}-${nextBundle}.js`
  ): Promise<UploadedExtension> {
    const code = `bundle:${nextBundle++}`;
    definitions.set(code, definition);
    bundles.set(url, code);
    return {
      url,
      meta: {
        translations: {
          en: { title: `Title of ${meta.id}`, description: "Does things." },
        },
        integrity: await sha384(code),
        ...meta,
      },
    };
  }

  beforeEach(() => {
    localStorage.clear();
    frames = [];
    openPorts = [];
    nextBundle = 0;
    definitions.clear();
    bundles.clear();
    consent = vi.fn(async () => true);
    host = createHost();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const code = bundles.get(url);
        return code === undefined
          ? { ok: false, status: 404, statusText: "Not Found" }
          : {
              ok: true,
              arrayBuffer: async () => new TextEncoder().encode(code).buffer,
            };
      })
    );
  });

  afterEach(() => {
    const initializer = ExtensionInitalizer.getInstance();
    for (const registration of initializer.listRegisteredExtensions()) {
      initializer.unregisterExtension(registration.id);
    }
    for (const port of openPorts) {
      port.close();
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Simulates a page reload: the extension stops, but stays installed and granted. */
  function reload(id: string) {
    ExtensionInitalizer.getInstance().unregisterExtension(id);
  }

  it("asks before installing, and runs nothing when the user declines", async () => {
    consent.mockResolvedValue(false);
    const main = vi.fn();
    const extension = await publish(defineExtension({ main }), {
      id: "ext.declined",
      permissions: ["reading:position"],
      network: ["api.example.com"],
    });

    const installed = await createManager().loadExtension(extension);

    expect(installed).toBe(false);
    expect(consent).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionId: "ext.declined",
        title: "Title of ext.declined",
        sourceHost: "files.example.com",
        permissions: ["reading:position"],
        network: ["api.example.com"],
        isUpdate: false,
      })
    );
    expect(frames).toEqual([]);
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
      expect([...host.surfaces.toolbar.keys()]).toEqual([
        "sandbox:ext.demo:share",
      ])
    );
    expect(frames).toHaveLength(1);
    expect(frames[0]!.init.mode).toEqual({ kind: "background" });

    host.surfaces.toolbar.get("sandbox:ext.demo:share")!.onSelect!();
    await vi.waitFor(() => expect(host.panes.panes.value).toHaveLength(1));
    const pane = host.panes.panes.value[0]!;
    expect(pane.id).toMatch(/^sandbox:ext\.demo:/);

    // Rendering the pane is what connects its view frame.
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(pane.component(), container);
    await vi.waitFor(() => expect(frames).toHaveLength(2));
    expect(frames[1]!.init.mode).toEqual({
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

    expect(consent).toHaveBeenCalledTimes(1);
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

    expect(consent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isUpdate: true,
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

    expect(consent).toHaveBeenCalledTimes(2);
    expect(consent).toHaveBeenLastCalledWith(
      expect.objectContaining({ isUpdate: false })
    );
  });

  it("refuses a bundle that doesn't match the hash its manifest pins", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const extension = await publish(defineExtension({}), {
      id: "ext.tampered",
      integrity: await sha384("some other code"),
    });

    expect(await createManager().loadExtension(extension)).toBe(false);
    expect(consent).not.toHaveBeenCalled();
    expect(frames).toEqual([]);
  });

  it("refuses a manifest asking for a permission this version doesn't know", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const extension = await publish(defineExtension({}), {
      id: "ext.future",
      permissions: ["highlights:read"],
    });

    expect(await createManager().loadExtension(extension)).toBe(false);
    expect(consent).not.toHaveBeenCalled();
  });

  it("can't install without a way to ask the user", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const extension = await publish(defineExtension({}), { id: "ext.no-ui" });

    const manager = createExtensionManager(createLogin(), {
      sandboxFrameConnector: connector,
    });

    expect(await manager.loadExtension(extension)).toBe(false);
    expect(frames).toEqual([]);
  });

  it("shares the reading position, and keeps it current, only when granted", async () => {
    let granted: SandboxContext | null = null;
    let withheld: SandboxContext | null = null;
    const manager = createManager();
    await manager.loadExtension(
      await publish(
        defineExtension({
          main: (sb) => {
            granted = sb;
          },
        }),
        { id: "ext.with-position", permissions: ["reading:position"] }
      )
    );
    await manager.loadExtension(
      await publish(
        defineExtension({
          main: (sb) => {
            withheld = sb;
          },
        }),
        { id: "ext.without-position" }
      )
    );
    await vi.waitFor(() => expect(granted && withheld).toBeTruthy());

    expect(granted!.reading.position.value).toEqual({
      translationId: "BSB",
      bookId: "JHN",
      chapterNumber: 3,
    });
    expect(withheld!.reading.position.value).toBeNull();

    host.reading.value = { ...host.reading.value, chapterNumber: 4 };
    await vi.waitFor(() =>
      expect(granted!.reading.position.value?.chapterNumber).toBe(4)
    );
    expect(withheld!.reading.position.value).toBeNull();
  });

  it("only opens passages with reading:navigate", async () => {
    let sb: SandboxContext | null = null;
    await createManager().loadExtension(
      await publish(
        defineExtension({
          main: (context) => {
            sb = context;
          },
        }),
        { id: "ext.no-navigate" }
      )
    );
    await vi.waitFor(() => expect(sb).toBeTruthy());

    const error = await sb!.reading
      .open({ bookId: "GEN", chapter: 1 })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(SandboxError);
    expect((error as SandboxError).code).toBe("permission_denied");
    expect(host.openedReferences).toEqual([]);
  });

  it("passes the selected verses to a verse tool only with reading:selection", async () => {
    const seen: unknown[] = [];
    const manager = createManager();
    for (const [id, permissions] of [
      ["ext.sees-selection", ["reading:selection"]],
      ["ext.blind", []],
    ] as const) {
      await manager.loadExtension(
        await publish(
          defineExtension({
            main: async (sb) => {
              await sb.tools.registerVerseToolbarTool({
                id: "verse",
                title: "Verse",
                icon: { material: "star" },
                onSelect: ({ selection }) => void seen.push([id, selection]),
              });
            },
          }),
          { id, permissions: [...permissions] }
        )
      );
    }
    await vi.waitFor(() => expect(host.surfaces.verse.size).toBe(2));
    host.selectedVerses.value = [
      {
        bookId: "JHN",
        chapterNumber: 3,
        translationId: "BSB",
        verse: { number: 16 } as BibleSelectedVerse["verse"],
      },
    ];

    host.surfaces.verse.get("sandbox:ext.sees-selection:verse")!.onSelect!();
    host.surfaces.verse.get("sandbox:ext.blind:verse")!.onSelect!();

    await vi.waitFor(() => expect(seen).toHaveLength(2));
    expect(seen).toContainEqual([
      "ext.sees-selection",
      [{ bookId: "JHN", chapterNumber: 3, translationId: "BSB", verse: 16 }],
    ]);
    expect(seen).toContainEqual(["ext.blind", []]);
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
      expect(host.toasts).toEqual(["Title of ext.toaster: Saved!"])
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
    expect(host.surfaces.toolbar.size).toBe(0);
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
    await vi.waitFor(() => expect(host.panes.panes.value).toHaveLength(1));
    render(host.panes.panes.value[0]!.component(), container);

    await vi.waitFor(() => expect(viewError).toBeInstanceOf(SandboxError));
    expect((viewError as SandboxError).code).toBe("invalid_request");
    expect(host.surfaces.toolbar.size).toBe(0);
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
    await vi.waitFor(() => expect(host.panes.panes.value).toHaveLength(1));
    expect(host.surfaces.quick.size).toBe(1);

    manager.unloadExtension("ext.uninstalled");

    expect(host.surfaces.quick.size).toBe(0);
    expect(host.panes.panes.value).toEqual([]);
    expect(frames).toEqual([]);
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
    expect(consent).toHaveBeenCalledTimes(2);
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
    expect(consent).not.toHaveBeenCalled();
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

    expect(consent).not.toHaveBeenCalled();
    expect(
      manager.getExtensions().find((entry) => entry.id === "ext.pushy")
        ?.installed
    ).toBe(false);
  });

  it("only offers a sandboxed extension named in an autoinstall link", async () => {
    consent.mockResolvedValue(false);
    const extension = await publish(defineExtension({}), { id: "ext.linked" });
    window.history.replaceState(null, "", "/?autoinstall-ext.linked=true");
    try {
      const manager = createManager({
        defaultExtensions: { id: "defaults", extensions: [extension] },
      });

      await manager.loadDefaultExtensions();

      expect(consent).toHaveBeenCalledWith(
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
        network: ["api.example.com"],
        integrity,
      },
    });
  });

  it.each([
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
