// @vitest-environment node
import {
  uploadExtensionSet,
  type ExtensionSetManifest,
} from "@packages/seed-bible-extension-scripts/src/commands/publish";
import type { RecordsClient } from "@packages/seed-bible-extension-scripts/src/lib/recordsClient";

/*
 * `publish` gives the bundle and the icon each their own link in Seed
 * Bible's storage, and the manifest points at both.
 */
describe("publishing an extension set", () => {
  /** A records server that stores files at a URL named after their hash. */
  function fakeRecordsServer() {
    const files = new Map<string, { mimeType: string; bytes: Uint8Array }>();
    const pending = new Map<string, string>();
    const records = new Map<string, unknown>();
    const client = {
      endpoint: "https://auth.seedbible.org",
      recordFile: vi.fn(
        async (request: { fileSha256Hex: string; fileMimeType: string }) => {
          const uploadUrl = `https://files.example.com/user-1/${request.fileSha256Hex}`;
          pending.set(uploadUrl, request.fileMimeType);
          return {
            success: true,
            uploadUrl,
            uploadMethod: "PUT",
            uploadHeaders: {},
          };
        }
      ),
      recordData: vi.fn(async (request: { address: string; data: unknown }) => {
        records.set(request.address, request.data);
        return {
          success: true,
          recordName: "user-1",
          address: request.address,
        };
      }),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { body: Uint8Array }) => {
        files.set(url, { mimeType: pending.get(url)!, bytes: init.body });
        return new Response(null, { status: 200 });
      })
    );
    return { client: client as unknown as RecordsClient, files, records };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const manifest = (): ExtensionSetManifest => ({
    id: "verse-art",
    extensions: [
      {
        url: "",
        meta: {
          id: "verse-art",
          icon: "icon.svg",
          translations: { en: { title: "Verse Art", description: "" } },
          integrity: "sha384-AAAA",
        },
      },
    ],
  });
  const bundle = new TextEncoder().encode("export default 1;");
  const icon = {
    bytes: new TextEncoder().encode("<svg/>"),
    mimeType: "image/svg+xml",
    extension: ".svg",
  };

  it("uploads the icon to its own link and puts that link in the manifest", async () => {
    const server = fakeRecordsServer();

    const { manifest: published } = await uploadExtensionSet(
      server.client,
      "key",
      manifest(),
      bundle,
      icon
    );

    const [extension] = published.extensions;
    expect(extension!.meta.icon).not.toBe(extension!.url);
    expect(server.files.get(extension!.meta.icon!)).toEqual({
      mimeType: "image/svg+xml",
      bytes: icon.bytes,
    });
    expect(server.files.get(extension!.url)?.mimeType).toBe("text/javascript");
    expect(server.records.get("extension-sets/verse-art")).toEqual(published);
  });

  it("leaves the manifest without an icon when the extension has none", async () => {
    const server = fakeRecordsServer();
    const withoutIcon = manifest();
    delete withoutIcon.extensions[0]!.meta.icon;

    const { manifest: published } = await uploadExtensionSet(
      server.client,
      "key",
      withoutIcon,
      bundle,
      null
    );

    expect(published.extensions[0]!.meta.icon).toBeUndefined();
    expect(server.files.size).toBe(1);
  });
  it("uploads local screenshots and keeps hosted links, captions and order", async () => {
    const server = fakeRecordsServer();
    const set = manifest();
    set.extensions[0]!.meta.screenshots = [
      { src: "one.png", caption: "overview" },
      { src: "https://cdn.example.com/hosted.jpg" },
      { src: "two.webp" },
    ];
    const image = (text: string, extension: string, mimeType: string) => ({
      bytes: new TextEncoder().encode(text),
      extension,
      mimeType,
    });
    const one = image("one", ".png", "image/png");
    const two = image("two", ".webp", "image/webp");
    const { manifest: published } = await uploadExtensionSet(
      server.client,
      "key",
      set,
      bundle,
      icon,
      [one, null, two]
    );
    const shots = published.extensions[0]!.meta.screenshots!;
    expect(shots).toEqual([
      {
        src: expect.stringMatching(/^https:\/\/files.example.com\//),
        caption: "overview",
      },
      { src: "https://cdn.example.com/hosted.jpg" },
      { src: expect.stringMatching(/^https:\/\/files.example.com\//) },
    ]);
    expect(server.files.get(shots[0]!.src)).toEqual({
      bytes: one.bytes,
      mimeType: one.mimeType,
    });
    expect(server.files.get(shots[2]!.src)).toEqual({
      bytes: two.bytes,
      mimeType: two.mimeType,
    });
    expect(server.records.get("extension-sets/verse-art")).toEqual(published);
  });

  it("does not write the set when a screenshot upload fails", async () => {
    const server = fakeRecordsServer();
    server.client.recordFile = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        uploadUrl: "https://files.example.com/bundle",
        uploadMethod: "PUT",
        uploadHeaders: {},
      })
      .mockResolvedValue({
        success: false,
        errorCode: "server_error",
        errorMessage: "Upload unavailable",
      });
    const set = manifest();
    set.extensions[0]!.meta.screenshots = [{ src: "one.png" }];
    await expect(
      uploadExtensionSet(server.client, "key", set, bundle, null, [
        {
          bytes: new TextEncoder().encode("one"),
          extension: ".png",
          mimeType: "image/png",
        },
      ])
    ).rejects.toThrow();
    expect(server.records.size).toBe(0);
  });
});
