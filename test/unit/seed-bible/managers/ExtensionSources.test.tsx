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
import { sourced, useSandboxHarness } from "./sandboxHarness";

/*
 * Third-party extensions come from hosted `ExtensionSet`s, which the app
 * only knows about once someone adds one. These check that an installed
 * one is still there after a reload, and the ways a set gets added.
 */
describe("extension sources", () => {
  const h = useSandboxHarness();
  const SET_URL = "https://ext.example.com/verse-art/extension-set.json";
  const VERSE_ART = sourced(
    "ext.verse-art",
    "https://ext.example.com/verse-art/"
  );
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
      await first.loadExtension(listed(first, VERSE_ART)!.extension!)
    ).toBe(true);
    await vi.waitFor(() => expect(starts).toHaveLength(1));

    h.reload(VERSE_ART);
    const second = await loadPage();

    await vi.waitFor(() => expect(starts).toHaveLength(2));
    expect(listed(second, VERSE_ART)?.installed).toBe(true);
    // Already granted, so it isn't asked about again.
    expect(h.consent).toHaveBeenCalledTimes(1);
  });

  it("finds a bundle linked relative to its set, wherever the set is hosted", async () => {
    const extension = await hostVerseArt();
    // As `package` writes it: the bundle next to the set, by file name.
    h.hostSet(SET_URL, [{ ...extension, url: "bundle.js" }]);
    const manager = await loadPage();

    const set = await manager.discoverExtensionSet(SET_URL);
    expect(set!.extensions[0]).toMatchObject({
      url: "https://ext.example.com/verse-art/bundle.js",
    });
    expect(
      await manager.loadExtension(listed(manager, VERSE_ART)!.extension!)
    ).toBe(true);
    await vi.waitFor(() => expect(starts).toHaveLength(1));
  });

  it("shows an icon linked relative to its set, and names it when asking to install", async () => {
    const extension = await hostVerseArt();
    h.hostSet(SET_URL, [
      { ...extension, meta: { ...extension.meta, icon: "icon-1a2b.svg" } },
    ]);
    const manager = await loadPage();

    await manager.discoverExtensionSet(SET_URL);
    const listedExtension = listed(manager, VERSE_ART)!.extension!;
    await manager.loadExtension(listedExtension);

    const icon = "https://ext.example.com/verse-art/icon-1a2b.svg";
    expect(listedExtension.meta.icon).toBe(icon);
    expect(h.consent.mock.calls[0]![0].icon).toBe(icon);
  });

  it("leaves out an icon that isn't an https: link", async () => {
    const extension = await hostVerseArt();
    h.hostSet(SET_URL, [
      {
        ...extension,
        meta: { ...extension.meta, icon: "http://tracker.example.com/i.png" },
      },
    ]);
    const manager = await loadPage();

    await manager.discoverExtensionSet(SET_URL);

    expect(listed(manager, VERSE_ART)!.extension!.meta).not.toHaveProperty(
      "icon"
    );
  });

  describe("a set published to Seed Bible's records", () => {
    // Where `seed-bible-extension-scripts publish` puts it.
    const RECORD_URL =
      "https://auth.seedbible.org/api/v2/records/data?recordName=user-1&address=extension-sets%2Fext.verse-art";
    const RECORD_VERSE_ART = sourced(
      "ext.verse-art",
      "https://auth.seedbible.org/files/"
    );
    let runs: string[];

    beforeEach(() => {
      runs = [];
    });

    /** Publishes a version, overwriting the record as `publish` does. */
    async function publishVersion(version: string) {
      const extension = await h.publish(
        defineExtension({ main: () => void runs.push(version) }),
        { id: "ext.verse-art", version },
        `https://auth.seedbible.org/files/verse-art-${version}.js`
      );
      h.hostJson(RECORD_URL, {
        success: true,
        recordName: "user-1",
        data: { id: "ext.verse-art", extensions: [extension] },
        markers: ["publicRead"],
      });
    }

    it("installs from the record's link", async () => {
      await publishVersion("1.0.0");
      const manager = await loadPage();

      expect(await manager.discoverExtensionSet(RECORD_URL)).not.toBeNull();
      expect(
        await manager.loadExtension(
          listed(manager, RECORD_VERSE_ART)!.extension!
        )
      ).toBe(true);
      await vi.waitFor(() => expect(runs).toEqual(["1.0.0"]));
    });

    it("runs the newest version after it's republished, without installing again", async () => {
      await publishVersion("1.0.0");
      const first = await loadPage();
      await first.discoverExtensionSet(RECORD_URL);
      await first.loadExtension(listed(first, RECORD_VERSE_ART)!.extension!);
      await vi.waitFor(() => expect(runs).toHaveLength(1));

      await publishVersion("1.1.0");
      h.reload(RECORD_VERSE_ART);
      await loadPage();

      await vi.waitFor(() => expect(runs).toEqual(["1.0.0", "1.1.0"]));
      expect(h.consent).toHaveBeenCalledTimes(1);
    });

    it("isn't installable when the record can't be read", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      h.hostJson(RECORD_URL, {
        success: false,
        errorCode: "not_authorized",
        errorMessage: "You are not authorized to perform this action.",
      });
      const manager = await loadPage();

      expect(await manager.discoverExtensionSet(RECORD_URL)).toBeNull();
      expect(listed(manager, RECORD_VERSE_ART)).toBeUndefined();
    });
  });

  describe("who an extension is from", () => {
    const STORAGE = "https://filesbucket.s3.amazonaws.com";

    /** Seed Bible's records server, which knows which URLs are its own files. */
    const fileRecords = {
      getFileRecordName: vi.fn(async (url: string) =>
        url.startsWith(`${STORAGE}/`)
          ? new URL(url).pathname.split("/")[1]!
          : null
      ),
    };

    async function install(bundleUrl: string) {
      const extension = await h.publish(
        defineExtension({}),
        { id: "ext.verse-art" },
        bundleUrl
      );
      h.hostSet(SET_URL, [extension]);
      const manager = h.createManager({
        defaultExtensions: APP_SET,
        fileRecords,
      });
      const set = await manager.discoverExtensionSet(SET_URL);
      await manager.loadExtension(set!.extensions[0]!);
      return manager;
    }

    it("names the person who uploaded it to Seed Bible", async () => {
      h.host.publicProfiles.set("user-1", {
        name: "Kallyn",
        pictureUrl: "https://files.example.com/user-1/kallyn.png",
      });

      const manager = await install(`${STORAGE}/user-1/verse-art.js`);

      const kallyn = {
        userId: "user-1",
        name: "Kallyn",
        pictureUrl: "https://files.example.com/user-1/kallyn.png",
      };
      expect(h.consent.mock.calls[0]![0].uploader).toEqual(kallyn);
      await vi.waitFor(() =>
        expect(
          manager.sandboxPermissions.value[
            sourced("ext.verse-art", `${STORAGE}/user-1/`)
          ]
        ).toMatchObject({ uploader: kallyn })
      );
    });

    it("says it's from someone without saying who, when they have no name", async () => {
      await install(`${STORAGE}/user-2/verse-art.js`);

      expect(h.consent.mock.calls[0]![0].uploader).toEqual({
        userId: "user-2",
        name: null,
        pictureUrl: null,
      });
    });

    it("names the domain of one hosted anywhere else", async () => {
      await install("https://ext.example.com/verse-art/bundle.js");

      const request = h.consent.mock.calls[0]![0];
      expect(request.uploader).toBeUndefined();
      expect(request.sourceHost).toBe("ext.example.com");
    });

    it("falls back to the domain when Seed Bible can't be asked", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      fileRecords.getFileRecordName.mockRejectedValueOnce(new Error("offline"));

      await install(`${STORAGE}/user-1/verse-art.js`);

      const request = h.consent.mock.calls[0]![0];
      expect(request.uploader).toBeUndefined();
      expect(request.sourceHost).toBe("filesbucket.s3.amazonaws.com");
    });
  });

  it("forgets where an extension came from when it's uninstalled", async () => {
    await hostVerseArt();
    const first = await loadPage();
    await first.discoverExtensionSet(SET_URL);
    await first.loadExtension(listed(first, VERSE_ART)!.extension!);
    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem("sb-extension-sources")!)).toEqual(
        { [VERSE_ART]: SET_URL }
      )
    );

    first.unloadExtension(VERSE_ART);

    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem("sb-extension-sources")!)).toEqual(
        {}
      )
    );
    const second = await loadPage();
    expect(listed(second, VERSE_ART)).toBeUndefined();
  });

  it("only lists a set that was added, without installing anything", async () => {
    await hostVerseArt();
    const manager = await loadPage();

    expect(await manager.discoverExtensionSet(SET_URL)).not.toBeNull();

    expect(listed(manager, VERSE_ART)?.installed).toBe(false);
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
        extensionId: VERSE_ART,
        sourceHost: "ext.example.com",
        reason: "install",
      });
      await vi.waitFor(() =>
        expect(listed(manager, VERSE_ART)?.installed).toBe(false)
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
      expect(h.consent.mock.calls[0]![0].extensionId).toBe(
        sourced("ext.named", "https://ext.example.com/verse-art/")
      );
      expect(listed(manager, VERSE_ART)?.installed).toBe(false);
      expect(starts).toEqual([]);
    });
  });
});
