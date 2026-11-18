import {
  createExtensionManager,
  registerExtension,
  type ImportExtension,
  type ExtensionMeta,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { createLoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { i18n } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import { defineExtension } from "@packages/seed-bible/seed-bible/extensions";
import { useSandboxHarness } from "./sandboxHarness";

describe("ExtensionManager media", () => {
  const h = useSandboxHarness();
  const setUrl = "https://example.com/ext/set.json";
  const id = "ext.media";
  const caption = "screenshot-map";

  function createManager() {
    const login = createLoginManager({ os: CasualOSManager() });
    return createExtensionManager(login, {
      records: h.records.records,
      requestSandboxConsent: h.consent,
      sandboxFrameConnector: h.connector,
    });
  }

  beforeEach(async () => {
    await i18n.init({ lng: "es", fallbackLng: "en", resources: {} });
  });

  afterEach(() => {
    i18n.removeResourceBundle("en", id);
    i18n.removeResourceBundle("es", id);
    i18n.off("languageChanged");
  });

  it("resolves relative media, filters unsafe links, and keeps screenshot order and captions", async () => {
    const extension = await h.publish(defineExtension({ main: () => {} }), {
      id,
      icon: "./icon.png",
      screenshots: [
        { src: "./shot-1.png", caption },
        { src: "http://example.com/shot.png" },
        { src: "https://images.example.com/shot-2.webp" },
        { src: "data:image/png;base64,abc" },
        { src: "https://[invalid" },
      ],
    });
    h.hostSet(setUrl, [extension]);
    const manager = createManager();

    const set = await manager.discoverExtensionSet(setUrl);
    const discovered = set!.extensions[0]!;

    expect(discovered.meta.icon).toBe("https://example.com/ext/icon.png");
    expect(discovered.meta.screenshots).toEqual([
      { src: "https://example.com/ext/shot-1.png", caption },
      { src: "https://images.example.com/shot-2.webp" },
    ]);
    expect(await manager.loadExtension(discovered)).toBe(true);
  });

  it("keeps only the first eight safe screenshots after filtering", async () => {
    const screenshots = [
      { src: "http://example.com/unsafe.png" },
      ...Array.from({ length: 10 }, (_, index) => ({ src: `./${index}.png` })),
    ];
    const extension = await h.publish(defineExtension({ main: () => {} }), {
      id,
      screenshots,
    });
    h.hostSet(setUrl, [extension]);
    const set = await createManager().discoverExtensionSet(setUrl);
    expect(
      set!.extensions[0]!.meta.screenshots?.map((shot) => shot.src)
    ).toEqual(
      Array.from(
        { length: 8 },
        (_, index) => `https://example.com/ext/${index}.png`
      )
    );
  });

  it("keeps localhost development media", async () => {
    const extension = await h.publish(defineExtension({ main: () => {} }), {
      id,
      screenshots: [{ src: "./shot.png" }],
    });
    const localUrl = "http://localhost:3000/set.json";
    h.hostSet(localUrl, [extension]);

    const set = await createManager().discoverExtensionSet(localUrl);

    expect(set!.extensions[0]!.meta.screenshots).toEqual([
      { src: "http://localhost:3000/shot.png" },
    ]);
  });

  it.each([
    null,
    "shot.png",
    {},
    [null],
    ["shot.png"],
    [{ src: 42 }],
    [{ src: "shot.png", caption: 42 }],
    [{ src: "valid.png" }, { caption }],
  ])(
    "drops malformed screenshots %j while keeping the extension installable",
    async (screenshots) => {
      const extension = await h.publish(defineExtension({ main: () => {} }), {
        id,
      });
      h.hostJson(setUrl, {
        id: "media-set",
        extensions: [
          { ...extension, meta: { ...extension.meta, screenshots } },
        ],
      });
      const manager = createManager();

      const set = await manager.discoverExtensionSet(setUrl);

      expect(set).not.toBeNull();
      expect(set!.extensions[0]!.meta).not.toHaveProperty("screenshots");
      expect(await manager.loadExtension(set!.extensions[0]!)).toBe(true);
    }
  );

  it("loads Spanish captions for an uninstalled built-in once, including concurrent calls and later installation", async () => {
    const loadFullTranslations = vi.fn(async () => ({
      en: { title: "Media", description: "", [caption]: "Open the map" },
      es: { title: "Media", description: "", [caption]: "Abre el mapa" },
    }));
    const importCode = vi.fn(async () => ({
      default: () => registerExtension({ id, init: () => ({}) }),
    }));
    const extension: ImportExtension = {
      meta: {
        id,
        translations: {
          en: { title: "Media", description: "", [caption]: "Open the map" },
        },
        screenshots: [{ src: "/shot.png", caption }],
      },
      import: importCode,
      loadFullTranslations,
    };
    const manager = createManager();
    await manager.loadExtensionSet(
      { id: "built-ins", extensions: [extension] },
      () => false
    );
    expect(i18n.t(caption, { ns: id })).toBe("Open the map");

    await Promise.all([
      manager.loadExtensionTranslations(extension),
      manager.loadExtensionTranslations(extension),
    ]);
    await manager.loadExtensionTranslations(extension);

    expect(i18n.t(caption, { ns: id })).toBe("Abre el mapa");
    expect(loadFullTranslations).toHaveBeenCalledTimes(1);
    expect(importCode).not.toHaveBeenCalled();
    expect(
      manager.getExtensions().find((entry) => entry.id === id)?.installed
    ).toBe(false);

    expect(await manager.loadExtension(extension)).toBe(true);
    expect(importCode).toHaveBeenCalledTimes(1);
    expect(loadFullTranslations).toHaveBeenCalledTimes(1);
    expect(i18n.t(caption, { ns: id })).toBe("Abre el mapa");
  });

  it("loads translations from a newer set with the same extension id", async () => {
    const v1 = await h.publish(defineExtension({ main: () => {} }), {
      id,
      translations: { en: { title: "Media", description: "", old: "Old" } },
    });
    const v2 = await h.publish(defineExtension({ main: () => {} }), {
      id,
      translations: { en: { title: "Media", description: "", fresh: "Fresh" } },
    });
    const manager = createManager();
    h.hostSet(setUrl, [v1]);
    const first = (await manager.discoverExtensionSet(setUrl))!.extensions[0]!;
    expect(await manager.loadExtension(first)).toBe(true);
    h.hostSet(setUrl, [v2]);
    const second = (await manager.discoverExtensionSet(setUrl))!.extensions[0]!;
    const translations = await manager.loadExtensionTranslations(second);
    expect(translations.en.fresh).toBe("Fresh");
  });

  it("registers inline translations without a deferred import", async () => {
    const extension = await h.publish(defineExtension({ main: () => {} }), {
      id,
      translations: {
        en: { title: "Media", description: "", [caption]: "Open the map" },
        es: { title: "Media", description: "", [caption]: "Abre el mapa" },
      },
    });

    await createManager().loadExtensionTranslations(extension);

    expect(i18n.t(caption, { ns: id })).toBe("Abre el mapa");
    expect(h.frames).toHaveLength(0);
  });

  it("retries a failed translation import and keeps English available", async () => {
    const loadFullTranslations = vi
      .fn<() => Promise<ExtensionMeta["translations"]>>()
      .mockRejectedValueOnce(new Error("Missing translation chunk"))
      .mockResolvedValueOnce({
        en: { title: "Media", description: "", [caption]: "Open the map" },
        es: { title: "Media", description: "", [caption]: "Abre el mapa" },
      });
    const extension: ImportExtension = {
      meta: {
        id,
        translations: {
          en: { title: "Media", description: "", [caption]: "Open the map" },
        },
      },
      import: vi.fn(),
      loadFullTranslations,
    };
    const manager = createManager();
    await manager.loadExtensionSet(
      { id: "built-ins", extensions: [extension] },
      () => false
    );

    await expect(manager.loadExtensionTranslations(extension)).rejects.toThrow(
      "Missing translation chunk"
    );
    await expect(
      manager.loadExtensionTranslations(extension)
    ).resolves.toHaveProperty("es");

    expect(i18n.t(caption, { ns: id })).toBe("Abre el mapa");
  });
});
