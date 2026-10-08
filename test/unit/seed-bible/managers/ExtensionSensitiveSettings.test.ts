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
import {
  createCustomizationsManager,
  CUSTOMIZATION_MARKER,
  type CustomizationsManager,
  type SeedBibleCustomization,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import { createCustomizationVariantSelectionsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
import { createCustomizationExtensionPreferencesManager } from "@packages/seed-bible/seed-bible/managers/CustomizationExtensionPreferencesManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { SettingsManager } from "@packages/seed-bible/seed-bible/managers/SettingsManager";
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
        activeCustomization: signal(null),
        editingCustomization: signal(null),
        customizations: signal([]),
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

  describe("visibility", () => {
    it("is private unless the viewer chooses otherwise, even if the manifest says public", async () => {
      // An uploaded manifest isn't guaranteed to have passed validation.
      const meta = baseMeta();
      Object.assign(meta.sensitive!.exampleApi!, { visibility: "public" });
      extensionsListSignal.value = [entry(meta)];
      const manager = create();
      await flushPromises();

      expect(manager.getSensitiveDestination("ext-1", "exampleApi")).toEqual({
        host: "api.example.com",
        visibility: "private",
      });
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });

      expect(recordProxyMock.mock.calls[0]![4]).toEqual({ marker: "private" });
    });

    it("makes the proxy public when the viewer chooses, and keeps that choice on the next save", async () => {
      const manager = create();
      await flushPromises();

      await manager.setSensitiveValues(
        "ext-1",
        "exampleApi",
        { apiKey: "k" },
        { visibility: "public" }
      );
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k2" });

      expect(recordProxyMock.mock.calls[0]![4]).toEqual({
        marker: "publicRead",
      });
      expect(recordProxyMock.mock.calls[1]![4]).toEqual({
        marker: "publicRead",
      });
      // The pointer itself stays private whatever the proxy's visibility.
      expect(lastPointerWrite()![3]).toEqual({ marker: "private" });
      expect(
        manager.getSensitiveDestination("ext-1", "exampleApi")?.visibility
      ).toBe("public");
    });
  });

  describe("host override", () => {
    it("saves the viewer's host and routes the extension's own URL to it", async () => {
      const manager = create();
      await flushPromises();

      await manager.setSensitiveValues(
        "ext-1",
        "exampleApi",
        { apiKey: "k" },
        { host: " My-Proxy.example.org:8443 " }
      );
      const address = recordProxyMock.mock.calls[0]![1];

      expect(recordProxyMock.mock.calls[0]![2]).toBe(
        "my-proxy.example.org:8443"
      );
      expect(manager.getSensitiveDestination("ext-1", "exampleApi")).toEqual({
        host: "my-proxy.example.org:8443",
        visibility: "private",
      });
      expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(true);

      // The extension still addresses the host its manifest declares...
      await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1/chat",
      });
      // ...or the one the viewer chose.
      await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://my-proxy.example.org:8443/v1/chat",
      });
      expect(proxyRequestMock).toHaveBeenNthCalledWith(1, "user-1", address, {
        path: "/v1/chat",
        method: "GET",
        body: undefined,
      });
      expect(proxyRequestMock).toHaveBeenNthCalledWith(
        2,
        "user-1",
        address,
        expect.objectContaining({ path: "/v1/chat" })
      );
    });

    it("keeps the chosen host when the values are saved again without one", async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues(
        "ext-1",
        "exampleApi",
        { apiKey: "k" },
        { host: "proxy.example.org" }
      );

      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k2" });

      expect(recordProxyMock.mock.calls[1]![2]).toBe("proxy.example.org");
    });

    it("refuses a host with a scheme or path", async () => {
      const manager = create();
      await flushPromises();

      expect(
        await manager.setSensitiveValues(
          "ext-1",
          "exampleApi",
          { apiKey: "k" },
          { host: "https://proxy.example.org/v1" }
        )
      ).toBe(false);
      expect(recordProxyMock).not.toHaveBeenCalled();
    });

    // The viewer agreed to send this extension's values somewhere when it
    // declared one host; moving to another needs them entered again.
    it("asks again when the extension changes its own host, even after an override", async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues(
        "ext-1",
        "exampleApi",
        { apiKey: "k" },
        { host: "proxy.example.org" }
      );

      const moved = baseMeta();
      moved.sensitive!.exampleApi!.host = "api2.example.com";
      extensionsListSignal.value = [entry(moved)];

      expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
      expect(manager.getSensitiveDestination("ext-1", "exampleApi")?.host).toBe(
        "api2.example.com"
      );
      await expect(
        manager.fetchWithSensitiveValues("ext-1", {
          url: "https://proxy.example.org/v1",
        })
      ).rejects.toMatchObject({ code: "unknown_destination" });
    });
  });

  describe("failures that aren't the proxy's answer", () => {
    const setUp = async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });
      return manager;
    };

    it("reports a request that couldn't be sent as request_failed", async () => {
      proxyRequestMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const manager = await setUp();

      const error = await manager
        .fetchWithSensitiveValues("ext-1", {
          url: "https://api.example.com/v1",
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(SensitiveSettingsError);
      expect(error).toMatchObject({ code: "request_failed" });
    });

    it("reports a status a Response can't hold as request_failed", async () => {
      proxyRequestMock.mockResolvedValue({
        success: true,
        response: { statusCode: 999, headers: {}, body: "" },
      });
      const manager = await setUp();

      await expect(
        manager.fetchWithSensitiveValues("ext-1", {
          url: "https://api.example.com/v1",
        })
      ).rejects.toMatchObject({ code: "request_failed" });
    });

    it("reports a header value a Response won't accept as request_failed", async () => {
      proxyRequestMock.mockResolvedValue({
        success: true,
        response: { statusCode: 200, headers: { "x-bad": "a\nb" }, body: "" },
      });
      const manager = await setUp();

      await expect(
        manager.fetchWithSensitiveValues("ext-1", {
          url: "https://api.example.com/v1",
        })
      ).rejects.toMatchObject({ code: "request_failed" });
    });
  });

  // `new URL("https://api.example.com:443/").host` drops the port, so a host
  // declared or chosen with it used to never match.
  describe("the default https port", () => {
    it("matches a manifest host declared with :443", async () => {
      const meta = baseMeta();
      meta.sensitive!.exampleApi!.host = "api.example.com:443";
      extensionsListSignal.value = [entry(meta)];
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });

      const response = await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1",
      });

      expect(response.status).toBe(200);
      expect(recordProxyMock.mock.calls[0]![2]).toBe("api.example.com");
    });

    it("drops :443 from a host the viewer chose", async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues(
        "ext-1",
        "exampleApi",
        { apiKey: "k" },
        { host: "proxy.example.org:443" }
      );

      expect(recordProxyMock.mock.calls[0]![2]).toBe("proxy.example.org");
      await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://proxy.example.org:443/v1",
      });
      expect(proxyRequestMock).toHaveBeenCalled();
    });
  });

  describe("values nothing uses any more", () => {
    it("lists a proxy whose extension was uninstalled, and clears it", async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });
      const address = recordProxyMock.mock.calls[0]![1];
      expect(manager.getUnusedSensitiveProxies()).toEqual([]);

      extensionsListSignal.value = [{ ...entry(baseMeta()), installed: false }];

      expect(manager.getUnusedSensitiveProxies()).toEqual([
        {
          extensionId: "ext-1",
          proxyId: "exampleApi",
          host: "api.example.com",
        },
      ]);
      expect(await manager.clearSensitiveValues("ext-1", "exampleApi")).toBe(
        true
      );
      expect(eraseProxyMock).toHaveBeenCalledWith("user-1", address);
      expect(manager.getUnusedSensitiveProxies()).toEqual([]);
    });

    it("lists a proxy for an entry the extension no longer declares, or an extension that's gone", async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });

      const renamed = baseMeta();
      renamed.sensitive = { renamedApi: renamed.sensitive!.exampleApi! };
      extensionsListSignal.value = [entry(renamed)];
      expect(manager.getUnusedSensitiveProxies()).toHaveLength(1);

      extensionsListSignal.value = [];
      expect(manager.getUnusedSensitiveProxies()).toEqual([
        {
          extensionId: "ext-1",
          proxyId: "exampleApi",
          host: "api.example.com",
        },
      ]);
    });

    it("still reports a proxy saved for an older manifest as stored, so it can be cleared", async () => {
      const manager = create();
      await flushPromises();
      await manager.setSensitiveValues("ext-1", "exampleApi", { apiKey: "k" });

      const moved = baseMeta();
      moved.sensitive!.exampleApi!.host = "api2.example.com";
      extensionsListSignal.value = [entry(moved)];

      expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
      expect(manager.hasStoredSensitiveValues("ext-1", "exampleApi")).toBe(
        true
      );
    });
  });

  it("doesn't write the next account's pointers into the old one's record when the account changes mid-save", async () => {
    const pointerFor = (address: string) => ({
      exampleApi: {
        recordName: "x",
        address,
        host: "api.example.com",
        requestMapping: {},
        keys: [],
      },
    });
    getDataMock.mockImplementation(async (record: string, address: string) =>
      address !== EXTENSION_SENSITIVE_PROXIES_ADDRESS
        ? { success: false, errorCode: "data_not_found", errorMessage: "" }
        : {
            success: true,
            data:
              record === "user-1"
                ? { "ext-2": pointerFor("user-1-proxy") }
                : { "ext-9": pointerFor("user-2-proxy") },
          }
    );
    const manager = create();
    await flushPromises();
    let releaseProxy = () => {};
    recordProxyMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseProxy = () =>
            resolve({ success: true, recordName: "user-1", address: "" });
        })
    );

    const saving = manager.setSensitiveValues("ext-1", "exampleApi", {
      apiKey: "secret-key",
    });
    await flushPromises();
    userIdSignal.value = "user-2";
    await flushPromises();
    releaseProxy();

    expect(await saving).toBe(false);
    expect(lastPointerWrite()).toBeUndefined();
    const newAddress = recordProxyMock.mock.calls[0]![1];
    expect(eraseProxyMock).toHaveBeenCalledWith("user-1", newAddress);
    expect(manager.sensitiveProxiesByExtensionId.value).toHaveProperty("ext-9");
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

  describe("a Customization's own values", () => {
    const CUSTOMIZATION_ID = "customization_shared";

    const settings = {
      settings: signal({
        themeId: "light",
        customTheme: {},
        customHighlights: {},
      }),
    } as unknown as SettingsManager;

    const createCustomizations = (href = "http://localhost/") => {
      const login = {
        userId: userIdSignal,
        profile: signal(null),
      } as unknown as LoginManager;
      return createCustomizationsManager(
        os,
        login,
        createTheme(settings),
        createNavigationManager({ initialHref: href }),
        createCustomizationVariantSelectionsManager(os, login),
        createCustomizationExtensionPreferencesManager(os, login)
      );
    };

    const createWith = (customizations: CustomizationsManager) =>
      createExtensionSettingsManager(
        os,
        { userId: userIdSignal } as unknown as LoginManager,
        { extensions: extensionsListSignal } as unknown as ExtensionManager,
        customizations
      );

    /** The owner creates a Customization, opens it, and saves its key. */
    const ownerSavesKey = async (visibility?: "private" | "public") => {
      vi.spyOn(os, "listAllDataByMarker").mockResolvedValue({
        success: true,
        items: [],
      });
      const customizations = createCustomizations();
      const manager = createWith(customizations);
      await flushPromises();
      const created = await customizations.create();
      customizations.startEditing(created.id);
      const saved =
        await manager.customizationSensitiveSettings.setSensitiveValues(
          "ext-1",
          "exampleApi",
          { apiKey: "shared-key" },
          visibility ? { visibility } : {}
        );
      return { customizations, manager, saved, id: created.id };
    };

    /** The last write of the Customization record itself. */
    const lastCustomizationWrite = (id: string) =>
      recordDataMock.mock.calls
        .filter(([, address]) => address === id)
        .at(-1)?.[2] as SeedBibleCustomization | undefined;

    /** A viewer arriving through the Customization's share link. */
    const viewerOpensLink = async (
      pointer: Partial<
        SeedBibleCustomization["extensionSensitiveProxies"][string][string]
      > = {}
    ) => {
      const customization: SeedBibleCustomization = {
        id: CUSTOMIZATION_ID,
        name: "Shared",
        variants: [
          {
            id: "variant-1",
            name: "Light",
            baseTheme: "light",
            themes: {},
            highlightColors: {},
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        defaultVariantId: "variant-1",
        createdAt: 1,
        updatedAt: 1,
        extensionSettings: {},
        extensionSettingDefaults: {},
        extensionSensitiveProxies: {
          "ext-1": {
            exampleApi: {
              recordName: "owner-1",
              address: "owner-proxy",
              host: "api.example.com",
              defaultHost: "api.example.com",
              visibility: "public",
              requestMapping: {
                "headers.authorization.bearer": "apiKey",
                "body.client_id": "clientId",
              },
              keys: ["apiKey"],
              ...pointer,
            },
          },
        },
      };
      getDataMock.mockImplementation(async (record: string, address: string) =>
        record === "owner-1" && address === CUSTOMIZATION_ID
          ? { success: true, data: customization }
          : { success: false, errorCode: "data_not_found", errorMessage: "" }
      );
      const customizations = createCustomizations(
        `http://localhost/?customization=owner-1.${CUSTOMIZATION_ID}`
      );
      await customizations.initialCustomizationLoadPromise;
      const manager = createWith(customizations);
      await flushPromises();
      return manager;
    };

    it("saves the key in the owner's own proxy, public by default, and records only where it is", async () => {
      const { manager, saved, id } = await ownerSavesKey();

      expect(saved).toBe(true);
      expect(recordProxyMock).toHaveBeenCalledTimes(1);
      const [recordName, address, host, data, options] =
        recordProxyMock.mock.calls[0]!;
      expect(recordName).toBe("user-1");
      expect(host).toBe("api.example.com");
      expect(data).toEqual({ "headers.authorization.bearer": "shared-key" });
      expect(options).toEqual({ marker: "publicRead" });

      const record = lastCustomizationWrite(id)!;
      expect(recordDataMock.mock.calls.at(-1)![3]).toEqual({
        marker: CUSTOMIZATION_MARKER,
      });
      expect(
        record.extensionSensitiveProxies["ext-1"]?.exampleApi
      ).toMatchObject({
        recordName: "user-1",
        address,
        visibility: "public",
        keys: ["apiKey"],
      });
      expect(JSON.stringify(record)).not.toContain("shared-key");
      // The viewer's own settings are untouched.
      expect(lastPointerWrite()).toBeUndefined();
      expect(manager.isSensitiveValueSet("ext-1", "apiKey")).toBe(false);
      expect(
        manager.customizationSensitiveSettings.isSensitiveValueSet(
          "ext-1",
          "apiKey"
        )
      ).toBe(true);
      expect(
        manager.customizationSensitiveSettings.getSensitiveDestination(
          "ext-1",
          "exampleApi"
        )
      ).toEqual({ host: "api.example.com", visibility: "public" });
    });

    it("lets the owner keep the key to themselves", async () => {
      const { saved } = await ownerSavesKey("private");

      expect(saved).toBe(true);
      expect(recordProxyMock.mock.calls[0]![4]).toEqual({ marker: "private" });
    });

    it("refuses to save when no Customization is being edited", async () => {
      const manager = createWith(createCustomizations());
      await flushPromises();

      expect(
        await manager.customizationSensitiveSettings.setSensitiveValues(
          "ext-1",
          "exampleApi",
          { apiKey: "shared-key" }
        )
      ).toBe(false);
      expect(recordProxyMock).not.toHaveBeenCalled();
    });

    it("clears by erasing the proxy and dropping it from the Customization", async () => {
      const { manager, id } = await ownerSavesKey();
      const address = recordProxyMock.mock.calls[0]![1];

      expect(
        await manager.customizationSensitiveSettings.clearSensitiveValues(
          "ext-1",
          "exampleApi"
        )
      ).toBe(true);

      expect(eraseProxyMock).toHaveBeenCalledWith("user-1", address);
      expect(lastCustomizationWrite(id)!.extensionSensitiveProxies).toEqual({});
      expect(
        manager.customizationSensitiveSettings.hasStoredSensitiveValues(
          "ext-1",
          "exampleApi"
        )
      ).toBe(false);
    });

    it("sends a viewer's requests through the Customization's proxy when they haven't set their own", async () => {
      const manager = await viewerOpensLink();

      const response = await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1/chat",
      });

      expect(response.status).toBe(200);
      expect(proxyRequestMock).toHaveBeenCalledWith("owner-1", "owner-proxy", {
        path: "/v1/chat",
        method: "GET",
        body: undefined,
      });
      expect(manager.getSensitiveValueSource("ext-1", "apiKey")).toBe(
        "customization"
      );
      expect(manager.getSensitiveValueSource("ext-1", "clientId")).toBeNull();
    });

    it("uses the Customization's proxy for a signed-out viewer", async () => {
      userIdSignal.value = null;
      const manager = await viewerOpensLink();

      await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1/chat",
      });

      expect(proxyRequestMock).toHaveBeenCalledWith(
        "owner-1",
        "owner-proxy",
        expect.anything()
      );
    });

    it("prefers the viewer's own values over the Customization's", async () => {
      const manager = await viewerOpensLink();
      await manager.setSensitiveValues("ext-1", "exampleApi", {
        clientId: "own-client",
      });
      const ownAddress = recordProxyMock.mock.calls[0]![1];

      await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://api.example.com/v1/chat",
      });

      expect(proxyRequestMock).toHaveBeenCalledWith(
        "user-1",
        ownAddress,
        expect.anything()
      );
      // The viewer's entry replaces the Customization's whole entry, so its
      // API key isn't sent alongside the viewer's client id.
      expect(manager.getSensitiveValueSource("ext-1", "apiKey")).toBeNull();
      expect(manager.getSensitiveValueSource("ext-1", "clientId")).toBe(
        "viewer"
      );
    });

    it("routes to the host the Customization chose", async () => {
      const manager = await viewerOpensLink({ host: "proxy.example.org" });

      await manager.fetchWithSensitiveValues("ext-1", {
        url: "https://proxy.example.org/v1/chat",
      });

      expect(proxyRequestMock).toHaveBeenCalledWith(
        "owner-1",
        "owner-proxy",
        expect.anything()
      );
    });

    it("doesn't use a Customization's private proxy for anyone but its owner", async () => {
      const manager = await viewerOpensLink({ visibility: "private" });

      await expect(
        manager.fetchWithSensitiveValues("ext-1", {
          url: "https://api.example.com/v1/chat",
        })
      ).rejects.toMatchObject({ code: "not_set" });
      expect(proxyRequestMock).not.toHaveBeenCalled();
      expect(manager.getSensitiveValueSource("ext-1", "apiKey")).toBeNull();
    });

    it("doesn't use a Customization's proxy saved for an older host", async () => {
      const manager = await viewerOpensLink({ defaultHost: "old.example.com" });

      await expect(
        manager.fetchWithSensitiveValues("ext-1", {
          url: "https://api.example.com/v1/chat",
        })
      ).rejects.toMatchObject({ code: "not_set" });
      expect(proxyRequestMock).not.toHaveBeenCalled();
    });
  });
});
