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
import type { ExtensionManager } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import {
  defineExtension,
  type SandboxContext,
} from "@packages/seed-bible/seed-bible/extensions";
import { useSandboxHarness } from "./sandboxHarness";

/*
 * Third-party extensions come from hosted `ExtensionSet`s, which the app
 * only knows about once someone adds one. These check that an installed
 * one is still there after a reload, and the ways a set gets added.
 */
describe("extension sources", () => {
  const h = useSandboxHarness();
  const SET_URL = "https://ext.example.com/verse-art/extension-set.json";
  const APP_SET = { id: "seed-bible", extensions: [] };
  let starts: SandboxContext[];

  beforeEach(() => {
    starts = [];
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  /** A page load: a fresh manager, started the way the app starts it. */
  async function loadPage(): Promise<ExtensionManager> {
    const manager = h.createManager({ defaultExtensions: APP_SET });
    await manager.loadDefaultExtensions();
    return manager;
  }

  async function hostVerseArt() {
    const extension = await h.publish(
      defineExtension({ main: (sb) => void starts.push(sb) }),
      { id: "ext.verse-art" },
      "https://ext.example.com/verse-art/bundle.js"
    );
    h.hostSet(SET_URL, [extension]);
    return extension;
  }

  const listed = (manager: ExtensionManager, id: string) =>
    manager.getExtensions().find((entry) => entry.id === id);

  it("starts an extension installed from a link again after a reload", async () => {
    await hostVerseArt();
    const first = await loadPage();
    await first.discoverExtensionSet(SET_URL);
    expect(
      await first.loadExtension(listed(first, "ext.verse-art")!.extension!)
    ).toBe(true);
    await vi.waitFor(() => expect(starts).toHaveLength(1));

    h.reload("ext.verse-art");
    const second = await loadPage();

    await vi.waitFor(() => expect(starts).toHaveLength(2));
    expect(listed(second, "ext.verse-art")?.installed).toBe(true);
    // Already granted, so it isn't asked about again.
    expect(h.consent).toHaveBeenCalledTimes(1);
  });

  it("forgets where an extension came from when it's uninstalled", async () => {
    await hostVerseArt();
    const first = await loadPage();
    await first.discoverExtensionSet(SET_URL);
    await first.loadExtension(listed(first, "ext.verse-art")!.extension!);
    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem("sb-extension-sources")!)).toEqual(
        { "ext.verse-art": SET_URL }
      )
    );

    first.unloadExtension("ext.verse-art");

    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem("sb-extension-sources")!)).toEqual(
        {}
      )
    );
    const second = await loadPage();
    expect(listed(second, "ext.verse-art")).toBeUndefined();
  });

  it("only lists a set that was added, without installing anything", async () => {
    await hostVerseArt();
    const manager = await loadPage();

    expect(await manager.discoverExtensionSet(SET_URL)).not.toBeNull();

    expect(listed(manager, "ext.verse-art")?.installed).toBe(false);
    expect(h.consent).not.toHaveBeenCalled();
    expect(localStorage.getItem("sb-extension-sources")).toBeNull();
  });

  it("only adds sets over https, or from a local development server", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const manager = await loadPage();

    expect(
      await manager.discoverExtensionSet("http://ext.example.com/set.json")
    ).toBeNull();
    expect(
      await manager.discoverExtensionSet("javascript:alert(1)")
    ).toBeNull();
    expect(fetch).not.toHaveBeenCalled();

    h.hostSet("http://localhost:5174/extension-set.json", []);
    expect(
      await manager.discoverExtensionSet(
        "http://localhost:5174/extension-set.json"
      )
    ).not.toBeNull();
  });

  describe("a link with ?extensionSet=", () => {
    it("asks the user about an extension the link names, and installs it only if they agree", async () => {
      await hostVerseArt();
      h.consent.mockResolvedValue(false);
      window.history.replaceState(
        null,
        "",
        `/?extensionSet=${encodeURIComponent(SET_URL)}&autoinstall-ext.verse-art=true`
      );

      const manager = await loadPage();

      await vi.waitFor(() => expect(h.consent).toHaveBeenCalledTimes(1));
      expect(h.consent.mock.calls[0]![0]).toMatchObject({
        extensionId: "ext.verse-art",
        sourceHost: "ext.example.com",
        reason: "install",
      });
      await vi.waitFor(() =>
        expect(listed(manager, "ext.verse-art")?.installed).toBe(false)
      );
      expect(starts).toEqual([]);
    });

    it("only lists the set's extensions the link doesn't name", async () => {
      const unnamed = await hostVerseArt();
      const named = await h.publish(
        defineExtension({}),
        { id: "ext.named" },
        "https://ext.example.com/verse-art/named.js"
      );
      // Handled in order, so once the named one is asked about, the
      // unnamed one has been passed over.
      h.hostSet(SET_URL, [unnamed, named]);
      h.consent.mockResolvedValue(false);
      window.history.replaceState(
        null,
        "",
        `/?extensionSet=${encodeURIComponent(SET_URL)}&autoinstall-ext.named=true`
      );

      const manager = await loadPage();

      await vi.waitFor(() => expect(h.consent).toHaveBeenCalledTimes(1));
      expect(h.consent.mock.calls[0]![0].extensionId).toBe("ext.named");
      expect(listed(manager, "ext.verse-art")?.installed).toBe(false);
      expect(starts).toEqual([]);
    });
  });
});
