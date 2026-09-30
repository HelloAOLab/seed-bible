import {
  createExtensionSettingsManager,
  EXTENSION_SETTING_VALUES_ADDRESS,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSettingsManager";
import {
  EXTENSION_SENSITIVE_PROXIES_ADDRESS,
  SensitiveSettingsError,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSensitiveSettings";
import type {
  ExtensionListEntry,
  ExtensionManager,
  ExtensionMeta,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { CustomizationsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal, type Signal } from "@preact/signals";
import type { Mock } from "vitest";

describe("ExtensionSettingsManager sensitive settings", () => {
  let os: CasualOSManager;
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let recordProxyMock: Mock;
  let eraseProxyMock: Mock;
  let proxyRequestMock: Mock;
  let userIdSignal: Signal<string | null>;
  let extensionsListSignal: Signal<ExtensionListEntry[]>;
  let errorSpy: Mock;

  const flushPromises = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  const baseMeta = (): ExtensionMeta => ({
    id: "ext-1",
    translations: { en: { title: "ext-1", description: "" } },
    settings: {
      greeting: { type: "string", default: "Hello" },
      apiKey: { type: "string", sensitive: "exampleApi" },
      clientId: { type: "string", sensitive: "exampleApi" },
    },
    sensitive: {
      exampleApi: {
        host: "api.example.com",
        requestMapping: {
          "headers.authorization.bearer": "apiKey",
          "body.client_id": "clientId",
        },
      },
    },
  });

  const entry = (meta: ExtensionMeta): ExtensionListEntry => ({
    id: meta.id,
    extension: { url: `https://example.com/${meta.id}.js`, meta },
    extensionSet: null,
    registration: null,
    installed: true,
    pendingInstallation: false,
  });

  /** The last pointer record written to the viewer's own record. */
  const lastPointerWrite = () =>
    recordDataMock.mock.calls
      .filter(([, address]) => address === EXTENSION_SENSITIVE_PROXIES_ADDRESS)
      .at(-1);

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue({ success: true } as never);
    recordProxyMock = vi
      .spyOn(os, "recordProxy")
      .mockResolvedValue({ success: true, recordName: "user-1", address: "" });
    eraseProxyMock = vi
      .spyOn(os, "eraseProxy")
      .mockResolvedValue({ success: true });
    proxyRequestMock = vi.spyOn(os, "proxyRequest").mockResolvedValue({
      success: true,
      response: {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: '{"ok":true}',
      },
    });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    userIdSignal = signal<string | null>("user-1");
    extensionsListSignal = signal([entry(baseMeta())]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const create = () =>
    createExtensionSettingsManager(
      os,
      { userId: userIdSignal } as unknown as LoginManager,
      { extensions: extensionsListSignal } as unknown as ExtensionManager,
      {
        getActiveExtensionSettingDefault: () => "from-customization",
      } as unknown as CustomizationsManager
    );

  it("stores every setting of one destination in a single private proxy record", async () => {
    const manager = create();
    await flushPromises();

    const saved = await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
      clientId: "client-123",
    });

    expect(saved).toBe(true);
    expect(recordProxyMock).toHaveBeenCalledTimes(1);
    const [recordName, address, host, data, options] =
      recordProxyMock.mock.calls[0]!;
    expect(recordName).toBe("user-1");
    expect(typeof address).toBe("string");
    expect(host).toBe("api.example.com");
    expect(data).toEqual({
      "headers.authorization.bearer": "secret-key",
      "body.client_id": "client-123",
    });
    expect(options).toEqual({ marker: "private" });

    const pointer = lastPointerWrite()!;
    expect(pointer[3]).toEqual({ marker: "private" });
    expect(JSON.stringify(pointer[2])).not.toContain("secret-key");
    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(true);
    expect(manager.isSensitiveValueSet("ext-1", "clientId")).toBe(true);
  });

  it("never reads or writes a sensitive value through the public settings record", async () => {
    getDataMock.mockImplementation(async (_record: string, address: string) =>
      address === EXTENSION_SETTING_VALUES_ADDRESS
        ? { success: true, data: { "ext-1": { apiKey: "leaked" } } }
        : { success: false, errorCode: "data_not_found", errorMessage: "" }
    );
    const manager = create();
    await flushPromises();

    // Neither the stored value nor the Customization default comes back.
    expect(manager.getValue("ext-1", "apiKey")).toBeUndefined();

    await manager.setValue("ext-1", "apiKey", "typed-secret");
    await manager.flushPendingSave();

    expect(
      recordDataMock.mock.calls.some(
        ([, address]) => address === EXTENSION_SETTING_VALUES_ADDRESS
      )
    ).toBe(false);
  });

  it("replaces the whole destination on a second save, reusing its record", async () => {
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "first",
      clientId: "client-123",
    });
    const firstAddress = recordProxyMock.mock.calls[0]![1];

    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "second",
    });

    expect(recordProxyMock.mock.calls[1]![1]).toBe(firstAddress);
    expect(recordProxyMock.mock.calls[1]![3]).toEqual({
      "headers.authorization.bearer": "second",
    });
    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(true);
    expect(manager.isSensitiveValueSet("ext-1", "clientId")).toBe(false);
  });

  it("clears by erasing the proxy record, and saving nothing clears too", async () => {
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });
    const address = recordProxyMock.mock.calls[0]![1];

    expect(
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "" })
    ).toBe(true);

    expect(eraseProxyMock).toHaveBeenCalledWith("user-1", address);
    expect(lastPointerWrite()![2]).toEqual({});
    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
  });

  it("keeps the pointer when the proxy record can't be erased", async () => {
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });
    const writesBefore = recordDataMock.mock.calls.length;
    eraseProxyMock.mockResolvedValue({
      success: false,
      errorCode: "server_error",
      errorMessage: "",
    });

    expect(await manager.clearSensitiveValues("ext-1", "exampleApi")).toBe(
      false
    );

    expect(recordDataMock.mock.calls.length).toBe(writesBefore);
    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(true);
  });

  it("reports a failed proxy save without recording it as set", async () => {
    recordProxyMock.mockResolvedValue({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "",
    });
    const manager = create();
    await flushPromises();

    expect(
      await manager.setSensitiveValues("ext-1", "exampleApi", {
        apiKey: "secret-key",
      })
    ).toBe(false);

    expect(lastPointerWrite()).toBeUndefined();
    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
  });

  // Saving over a record that didn't load would drop the other extensions'
  // pointers, leaving their secrets stored with nothing to clear them by.
  it("refuses to save when the pointer record failed to load", async () => {
    getDataMock.mockResolvedValue({
      success: false,
      errorCode: "server_error",
      errorMessage: "",
    });
    const manager = create();
    await flushPromises();

    expect(
      await manager.setSensitiveValues("ext-1", "exampleApi", {
        apiKey: "secret-key",
      })
    ).toBe(false);
    expect(recordProxyMock).not.toHaveBeenCalled();
  });

  it("does nothing while signed out", async () => {
    userIdSignal.value = null;
    const manager = create();
    await flushPromises();

    expect(
      await manager.setSensitiveValues("ext-1", "exampleApi", {
        apiKey: "secret-key",
      })
    ).toBe(false);
    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1",
      })
    ).rejects.toMatchObject({ code: "signed_out" });
    expect(recordProxyMock).not.toHaveBeenCalled();
  });

  it("sends a request through the proxy for the URL's host", async () => {
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });
    const address = recordProxyMock.mock.calls[0]![1];

    const response = await manager.fetchWithSensitiveValues("ext-1", {
      url: "https://api.example.com/v1/chat?stream=false",
      method: "POST",
      body: { prompt: "hi" },
    });

    expect(proxyRequestMock).toHaveBeenCalledWith("user-1", address, {
      path: "/v1/chat?stream=false",
      method: "POST",
      body: { prompt: "hi" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("builds a bodiless response for a 204", async () => {
    proxyRequestMock.mockResolvedValue({
      success: true,
      response: { statusCode: 204, headers: {}, body: "" },
    });
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });

    const response = await manager.fetchWithSensitiveValues("ext-1", {
      url: "https://api.example.com/v1",
      method: "DELETE",
    });

    expect(response.status).toBe(204);
  });

  it("rejects a URL the extension doesn't declare, or one that isn't https", async () => {
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });

    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "https://attacker.example/collect",
      })
    ).rejects.toMatchObject({ code: "unknown_destination" });
    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "http://api.example.com/v1",
      })
    ).rejects.toMatchObject({ code: "invalid_url" });
    await expect(
      manager.fetchWithSensitiveValues("ext-1", { url: "not a url" })
    ).rejects.toBeInstanceOf(SensitiveSettingsError);
    expect(proxyRequestMock).not.toHaveBeenCalled();
  });

  it("rejects with not_set before anything is saved", async () => {
    const manager = create();
    await flushPromises();

    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1",
      })
    ).rejects.toMatchObject({ code: "not_set" });
  });

  it("reports a proxy failure as request_failed", async () => {
    proxyRequestMock.mockResolvedValue({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "Nope",
    });
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });

    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1",
      })
    ).rejects.toMatchObject({ code: "request_failed" });
  });

  it("asks which destination to use when two declare the same host", async () => {
    const meta = baseMeta();
    meta.settings!.otherKey = { type: "string", sensitive: "second" };
    meta.sensitive!.second = {
      host: "api.example.com",
      requestMapping: { "headers.authorization": "otherKey" },
    };
    extensionsListSignal.value = [entry(meta)];
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "second", { otherKey: "k" });
    const address = recordProxyMock.mock.calls[0]![1];

    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1",
      })
    ).rejects.toMatchObject({ code: "ambiguous_destination" });

    await manager.fetchWithSensitiveValues("ext-1", {
      url: "https://api.example.com/v1",
      proxy: "second",
    });
    expect(proxyRequestMock).toHaveBeenCalledWith(
      "user-1",
      address,
      expect.anything()
    );
  });

  // The proxy still sends to the host it was saved with, so after the
  // extension moves to a new host it must not be used until saved again.
  it("treats values saved for an older host as not set", async () => {
    getDataMock.mockImplementation(async (_record: string, address: string) =>
      address === EXTENSION_SENSITIVE_PROXIES_ADDRESS
        ? {
            success: true,
            data: {
              "ext-1": {
                exampleApi: {
                  recordName: "user-1",
                  address: "old-proxy",
                  host: "old.example.com",
                  requestMapping: {
                    "headers.authorization.bearer": "apiKey",
                    "body.client_id": "clientId",
                  },
                  keys: ["apiKey"],
                },
              },
            },
          }
        : { success: false, errorCode: "data_not_found", errorMessage: "" }
    );
    const manager = create();
    await flushPromises();

    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
    await expect(
      manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1",
      })
    ).rejects.toMatchObject({ code: "not_set" });

    // Saving again updates the same record to the new host.
    await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });
    expect(recordProxyMock).toHaveBeenCalledWith(
      "user-1",
      "old-proxy",
      "api.example.com",
      { "headers.authorization.bearer": "k" },
      { marker: "private" }
    );
    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(true);
  });

  it("drops the previous account's pointers when the account changes", async () => {
    const manager = create();
    await flushPromises();
    await manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });

    userIdSignal.value = "user-2";
    await flushPromises();

    expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
