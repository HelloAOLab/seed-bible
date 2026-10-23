// @vitest-environment node
import {
  createClient,
  writePublicData,
  type RecordsClient,
} from "@packages/seed-bible-extension-scripts/src/lib/recordsClient";

describe("createClient", () => {
  beforeEach(() => {
    vi.stubEnv("SEED_BIBLE_ENDPOINT", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // The records server rejects login requests from origins it doesn't allow.
  it("sends every request from https://auth.ao.bot, whichever server it talks to", async () => {
    const requests: { url: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
        requests.push({ url, headers: init.headers });
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      })
    );

    await createClient().requestLogin({
      address: "author@example.com",
      addressType: "email",
    });
    await createClient("http://localhost:2999").recordData({
      recordKey: "key",
      address: "extension-sets/x",
      data: {},
    });

    expect(requests.map((request) => request.url)).toEqual([
      "https://auth.seedbible.org/api/v3/callProcedure",
      "http://localhost:2999/api/v3/callProcedure",
    ]);
    for (const request of requests) {
      expect(request.headers.origin).toBe("https://auth.ao.bot");
    }
  });
});

/*
 * `publish` keeps an extension's manifest in a data record, so the link
 * people install from keeps working, and keeps up, across versions.
 */
describe("writePublicData", () => {
  /** A records server holding data records in memory. */
  function fakeRecordsServer(endpoint = "https://auth.seedbible.org") {
    const records = new Map<string, { data: unknown; markers: string[] }>();
    const client = {
      endpoint,
      recordData: vi.fn(
        async (request: {
          recordKey: string;
          address: string;
          data: unknown;
          markers: string[];
        }) => {
          if (request.recordKey !== "key-for-user-1") {
            return {
              success: false,
              errorCode: "record_not_found",
              errorMessage: "Record not found.",
            };
          }
          records.set(`user-1/${request.address}`, {
            data: request.data,
            markers: request.markers,
          });
          return {
            success: true,
            recordName: "user-1",
            address: request.address,
          };
        }
      ),
    };
    /** What a GET of `url` would read. */
    const read = (url: string) => {
      const { pathname, searchParams } = new URL(url);
      expect(url.startsWith(endpoint)).toBe(true);
      expect(pathname).toBe("/api/v2/records/data");
      return records.get(
        `${searchParams.get("recordName")}/${searchParams.get("address")}`
      );
    };
    return { client: client as unknown as RecordsClient, read };
  }

  it("keeps the same link when the data changes", async () => {
    const server = fakeRecordsServer();

    const first = await writePublicData(
      server.client,
      "key-for-user-1",
      "extension-sets/ext.verse-art",
      { version: "1.0.0" }
    );
    const second = await writePublicData(
      server.client,
      "key-for-user-1",
      "extension-sets/ext.verse-art",
      { version: "1.1.0" }
    );

    expect(second.dataUrl).toBe(first.dataUrl);
    expect(server.read(first.dataUrl)).toEqual({
      data: { version: "1.1.0" },
      markers: ["publicRead"],
    });
  });

  it("links to the records server it wrote to", async () => {
    const server = fakeRecordsServer("http://localhost:2999");

    const { dataUrl } = await writePublicData(
      server.client,
      "key-for-user-1",
      "extension-sets/ext.verse-art",
      {}
    );

    expect(server.read(dataUrl)).toBeDefined();
  });

  it("fails, saying why, when the server refuses the write", async () => {
    const server = fakeRecordsServer();

    await expect(
      writePublicData(server.client, "wrong-key", "extension-sets/x", {})
    ).rejects.toThrow("record_not_found Record not found.");
  });
});
