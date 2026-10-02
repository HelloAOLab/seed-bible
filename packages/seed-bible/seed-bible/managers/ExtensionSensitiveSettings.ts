import * as z from "zod/v4";
import { effect, signal, type ReadonlySignal } from "@preact/signals";
import { v4 as uuid } from "uuid";
import type { CasualOSManager, ProxyRequestMethod } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import type { ExtensionManager } from "./ExtensionManager";
import {
  isSupportedSensitiveRequestProperty,
  isValidSensitiveHost,
  normalizeSensitiveHost,
  type ExtensionSensitiveProxyDefinition,
  type ExtensionSensitiveProxyVisibility,
} from "./extensionSettingConstraints";

export const EXTENSION_SENSITIVE_PROXIES_ADDRESS = "extensionSensitiveProxies";

/**
 * The record that points at the proxies is always `private`. Every other
 * record the app writes is `publicRead`, which is exactly why sensitive
 * values can't live in `ExtensionSettingsManager`'s record.
 */
const PRIVATE_MARKER = "private";

/**
 * On a proxy record `publicRead` grants only `run`: anyone who knows the
 * address can send requests through it, but nobody but its owner can read its
 * values back.
 */
const PROXY_MARKERS: Record<ExtensionSensitiveProxyVisibility, string> = {
  private: PRIVATE_MARKER,
  public: "publicRead",
};

/**
 * Where one extension's values for one `sensitive` entry are held, and what
 * the manifest said when they were saved. The values themselves are only in
 * the proxy record; this says which settings have one.
 */
export interface SensitiveProxyPointer {
  recordName: string;
  address: string;
  /** Where the proxy sends requests: the manifest's host, or the one the viewer chose. */
  host: string;
  /** The manifest's host when this was saved. */
  defaultHost: string;
  visibility: ExtensionSensitiveProxyVisibility;
  requestMapping: Record<string, string>;
  /** The settings that had a value in the last save. */
  keys: string[];
}

const pointersPayloadSchema = z.record(
  z.string(),
  z.record(
    z.string(),
    z
      .object({
        recordName: z.string(),
        address: z.string(),
        host: z.string(),
        defaultHost: z.string().optional(),
        visibility: z.enum(["private", "public"]).optional(),
        requestMapping: z.record(z.string(), z.string()),
        keys: z.array(z.string()),
      })
      // Pointers saved before hosts and visibility could be chosen.
      .transform(
        (pointer): SensitiveProxyPointer => ({
          ...pointer,
          defaultHost: pointer.defaultHost ?? pointer.host,
          visibility: pointer.visibility ?? "private",
        })
      )
  )
);

type Pointers = Record<string, Record<string, SensitiveProxyPointer>>;

export type SensitiveSettingsErrorCode =
  | "signed_out"
  | "not_loaded"
  | "invalid_url"
  | "unknown_destination"
  | "ambiguous_destination"
  | "not_set"
  | "request_failed";

/** Thrown by `fetchWithSensitiveValues`; `code` says which way it failed. */
export class SensitiveSettingsError extends Error {
  readonly code: SensitiveSettingsErrorCode;

  constructor(code: SensitiveSettingsErrorCode, message: string) {
    super(message);
    this.name = "SensitiveSettingsError";
    this.code = code;
  }
}

export interface SensitiveFetchRequest {
  /**
   * Must be `https:`, and its host one this extension's `sensitive` section
   * declares (or the host the viewer chose instead). The request goes to the
   * viewer's chosen host either way, with this URL's path and query.
   */
  url: string | URL;
  /** Defaults to `GET`, like `fetch`. */
  method?: ProxyRequestMethod;
  /** Sent as JSON; a string is sent as-is. Ignored for `GET` and `HEAD`. */
  body?: unknown;
  /**
   * The `sensitive` entry to send through. Only needed when more than one
   * entry declares the URL's host.
   */
  proxy?: string;
}

/** Where one `sensitive` entry's requests go and who may send them. */
export interface SensitiveDestination {
  host: string;
  visibility: ExtensionSensitiveProxyVisibility;
}

export interface SensitiveSaveOptions {
  /** Replaces the manifest's host. Omit to keep the last saved one, or the manifest's. */
  host?: string;
  /** Omit to keep the last saved visibility, or `private` if there is none. */
  visibility?: ExtensionSensitiveProxyVisibility;
}

/**
 * Saved values nothing in the Configure window can reach any more: the
 * extension isn't installed, or no longer declares the entry.
 */
export interface UnusedSensitiveProxy {
  extensionId: string;
  proxyId: string;
  host: string;
}

export interface ExtensionSensitiveSettings {
  /** extensionId -> sensitive entry id -> where its values are held. Empty when signed out. */
  sensitiveProxiesByExtensionId: ReadonlySignal<Pointers>;
  /**
   * True when the viewer has stored a value for this sensitive setting and the
   * extension still sends it to the same place. A value saved before the
   * extension changed its `host` or `requestMapping` counts as not set.
   */
  isSensitiveValueSet: (extensionId: string, key: string) => boolean;
  /**
   * True when a proxy record is saved for this entry, even one that no longer
   * counts as set because the extension changed its host or mapping since. It
   * still holds the viewer's values until it is cleared or saved over.
   */
  hasStoredSensitiveValues: (extensionId: string, proxyId: string) => boolean;
  /**
   * Proxies whose extension isn't installed or no longer declares the entry,
   * so the viewer can still clear them with `clearSensitiveValues`.
   */
  getUnusedSensitiveProxies: () => UnusedSensitiveProxy[];
  /**
   * Where this entry's requests go: the viewer's saved choice while it is
   * current, else the manifest's. Null if the extension declares no such entry.
   */
  getSensitiveDestination: (
    extensionId: string,
    proxyId: string
  ) => SensitiveDestination | null;
  /**
   * Replaces every value of one `sensitive` entry at once. A setting missing
   * from `values`, or given an empty string, ends up not set: the stored
   * values can't be read back, so there is nothing to keep them from. Saving
   * with nothing set clears the entry. Resolves to whether it was saved, and
   * to false for a host that isn't a host name with an optional port.
   *
   * The host and visibility can only change along with the values, so nothing
   * can send values already stored to a new host, or open them to other
   * people, without knowing them.
   */
  setSensitiveValues: (
    extensionId: string,
    proxyId: string,
    values: Record<string, string>,
    options?: SensitiveSaveOptions
  ) => Promise<boolean>;
  /** Deletes the proxy record and forgets it. Resolves to whether it was cleared. */
  clearSensitiveValues: (
    extensionId: string,
    proxyId: string
  ) => Promise<boolean>;
  /**
   * Sends a request through the viewer's proxy for the URL's host, which fills
   * in the sensitive values on the server. Rejects with a
   * `SensitiveSettingsError`. Request headers can't be set: the proxy only
   * sends the ones its values fill in.
   */
  fetchWithSensitiveValues: (
    extensionId: string,
    request: SensitiveFetchRequest
  ) => Promise<Response>;
}

function sameMapping(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every((key) => b[key] === a[key])
  );
}

/** Statuses a `Response` must be built without a body. */
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

export function createExtensionSensitiveSettings(
  os: CasualOSManager,
  login: LoginManager,
  extensions: ExtensionManager
): ExtensionSensitiveSettings {
  const pointers = signal<Pointers>({});
  let loadedUserId: string | null = null;
  let currentLoad: Promise<void> = Promise.resolve();
  let writeChain: Promise<unknown> = Promise.resolve();

  const load = async (userId: string): Promise<void> => {
    const result = await os.getData(
      userId,
      EXTENSION_SENSITIVE_PROXIES_ADDRESS
    );
    if (login.userId.value !== userId) {
      return;
    }
    if (!result.success) {
      // Anything but "nothing saved yet" leaves the account unloaded: a save
      // then would replace the record and lose track of proxies that still
      // hold this viewer's secrets.
      if (result.errorCode === "data_not_found") {
        pointers.value = {};
        loadedUserId = userId;
      } else {
        console.error(
          "Failed to load extension sensitive settings:",
          result.errorCode
        );
      }
      return;
    }
    const parsed = pointersPayloadSchema.safeParse(result.data);
    if (!parsed.success) {
      console.warn(
        "Failed to parse extension sensitive settings:",
        parsed.error
      );
      return;
    }
    pointers.value = parsed.data;
    loadedUserId = userId;
  };

  /** The signed-in account once its pointers are in memory, else null. */
  const waitForLoaded = async (): Promise<string | null> => {
    const userId = login.userId.value;
    if (!userId) {
      return null;
    }
    if (loadedUserId !== userId) {
      await currentLoad.catch(() => undefined);
    }
    return login.userId.value === userId && loadedUserId === userId
      ? userId
      : null;
  };

  const getMeta = (extensionId: string) =>
    extensions.extensions.value.find((entry) => entry.id === extensionId)
      ?.extension?.meta;

  /**
   * The request properties this entry fills in, and from which setting —
   * limited to the ones the manifest wires up both ways. Uploaded manifests
   * aren't guaranteed to have passed `extension.json` validation.
   */
  const usableMapping = (
    extensionId: string,
    proxyId: string
  ): {
    proxy: ExtensionSensitiveProxyDefinition;
    mapping: [string, string][];
  } | null => {
    const meta = getMeta(extensionId);
    const proxy = meta?.sensitive?.[proxyId];
    if (!proxy || !isValidSensitiveHost(proxy.host)) {
      return null;
    }
    const mapping = Object.entries(proxy.requestMapping ?? {}).filter(
      ([property, settingKey]) => {
        const setting = meta?.settings?.[settingKey];
        return (
          isSupportedSensitiveRequestProperty(property) &&
          setting?.type === "string" &&
          setting.sensitive === proxyId
        );
      }
    );
    return { proxy, mapping };
  };

  const isCurrent = (
    extensionId: string,
    proxyId: string,
    pointer: SensitiveProxyPointer
  ): boolean => {
    const proxy = getMeta(extensionId)?.sensitive?.[proxyId];
    // Compared with the manifest's host, not the one the viewer chose: an
    // extension that moves to a new host gets its values entered again.
    return (
      proxy !== undefined &&
      pointer.defaultHost === proxy.host &&
      sameMapping(pointer.requestMapping, proxy.requestMapping ?? {})
    );
  };

  const currentPointer = (
    extensionId: string,
    proxyId: string
  ): SensitiveProxyPointer | undefined => {
    const pointer = pointers.value[extensionId]?.[proxyId];
    return pointer && isCurrent(extensionId, proxyId, pointer)
      ? pointer
      : undefined;
  };

  const hasStoredSensitiveValues = (
    extensionId: string,
    proxyId: string
  ): boolean => pointers.value[extensionId]?.[proxyId] !== undefined;

  const getUnusedSensitiveProxies = (): UnusedSensitiveProxy[] => {
    const unused: UnusedSensitiveProxy[] = [];
    for (const [extensionId, byProxy] of Object.entries(pointers.value)) {
      const entry = extensions.extensions.value.find(
        (candidate) => candidate.id === extensionId
      );
      for (const [proxyId, pointer] of Object.entries(byProxy)) {
        if (!entry?.installed || !entry.extension?.meta.sensitive?.[proxyId]) {
          unused.push({ extensionId, proxyId, host: pointer.host });
        }
      }
    }
    return unused;
  };

  const getSensitiveDestination = (
    extensionId: string,
    proxyId: string
  ): SensitiveDestination | null => {
    const proxy = getMeta(extensionId)?.sensitive?.[proxyId];
    if (!proxy) {
      return null;
    }
    const pointer = currentPointer(extensionId, proxyId);
    return pointer
      ? { host: pointer.host, visibility: pointer.visibility }
      : { host: proxy.host, visibility: "private" };
  };

  const isSensitiveValueSet = (extensionId: string, key: string): boolean => {
    const setting = getMeta(extensionId)?.settings?.[key];
    if (setting?.type !== "string" || setting.sensitive === undefined) {
      return false;
    }
    return (
      currentPointer(extensionId, setting.sensitive)?.keys.includes(key) ===
      true
    );
  };

  const writePointers = async (
    userId: string,
    next: Pointers
  ): Promise<boolean> => {
    try {
      const result = await os.recordData(
        userId,
        EXTENSION_SENSITIVE_PROXIES_ADDRESS,
        next,
        { marker: PRIVATE_MARKER }
      );
      if (!result.success) {
        console.error(
          "Failed to save extension sensitive settings:",
          result.errorCode
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to save extension sensitive settings:", error);
      return false;
    }
    if (loadedUserId === userId) {
      pointers.value = next;
    }
    return true;
  };

  const withoutPointer = (extensionId: string, proxyId: string): Pointers => {
    const remaining = { ...pointers.value[extensionId] };
    delete remaining[proxyId];
    const next = { ...pointers.value };
    if (Object.keys(remaining).length === 0) {
      delete next[extensionId];
    } else {
      next[extensionId] = remaining;
    }
    return next;
  };

  const clearNow = async (
    userId: string,
    extensionId: string,
    proxyId: string
  ): Promise<boolean> => {
    const pointer = pointers.value[extensionId]?.[proxyId];
    if (!pointer) {
      return true;
    }
    // The proxy goes first: forgetting it first and then failing to erase it
    // would leave the secret stored with nothing pointing at it.
    try {
      const erased = await os.eraseProxy(pointer.recordName, pointer.address);
      if (!erased.success && erased.errorCode !== "data_not_found") {
        console.error(
          "Failed to clear extension sensitive settings:",
          erased.errorCode
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to clear extension sensitive settings:", error);
      return false;
    }
    return writePointers(userId, withoutPointer(extensionId, proxyId));
  };

  const setNow = async (
    userId: string,
    extensionId: string,
    proxyId: string,
    values: Record<string, string>,
    options: SensitiveSaveOptions
  ): Promise<boolean> => {
    const usable = usableMapping(extensionId, proxyId);
    const destination = getSensitiveDestination(extensionId, proxyId);
    if (!usable || !destination) {
      return false;
    }
    const host = normalizeSensitiveHost(options.host ?? destination.host);
    const visibility = options.visibility ?? destination.visibility;
    if (!isValidSensitiveHost(host) || !(visibility in PROXY_MARKERS)) {
      return false;
    }
    const data: Record<string, string> = {};
    const keys = new Set<string>();
    for (const [property, settingKey] of usable.mapping) {
      const value = values[settingKey];
      if (typeof value === "string" && value !== "") {
        data[property] = value;
        keys.add(settingKey);
      }
    }
    if (keys.size === 0) {
      return clearNow(userId, extensionId, proxyId);
    }
    // Reusing the address replaces the host and markers along with the
    // values, so an older save can't keep sending to where it used to.
    const address = pointers.value[extensionId]?.[proxyId]?.address ?? uuid();
    try {
      const result = await os.recordProxy(userId, address, host, data, {
        marker: PROXY_MARKERS[visibility],
      });
      if (!result.success) {
        console.error(
          "Failed to save extension sensitive settings:",
          result.errorCode
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to save extension sensitive settings:", error);
      return false;
    }
    return writePointers(userId, {
      ...pointers.value,
      [extensionId]: {
        ...pointers.value[extensionId],
        [proxyId]: {
          recordName: userId,
          address,
          host,
          defaultHost: usable.proxy.host,
          visibility,
          requestMapping: { ...usable.proxy.requestMapping },
          keys: [...keys],
        },
      },
    });
  };

  /** One write at a time, so a slower save can't land after a newer one. */
  const queue = (run: () => Promise<boolean>): Promise<boolean> => {
    const next = writeChain.then(run, run);
    writeChain = next;
    return next;
  };

  const setSensitiveValues = async (
    extensionId: string,
    proxyId: string,
    values: Record<string, string>,
    options: SensitiveSaveOptions = {}
  ): Promise<boolean> => {
    const userId = await waitForLoaded();
    if (!userId) {
      return false;
    }
    return queue(() =>
      loadedUserId === userId
        ? setNow(userId, extensionId, proxyId, values, options)
        : Promise.resolve(false)
    );
  };

  const clearSensitiveValues = async (
    extensionId: string,
    proxyId: string
  ): Promise<boolean> => {
    const userId = await waitForLoaded();
    if (!userId) {
      return false;
    }
    return queue(() =>
      loadedUserId === userId
        ? clearNow(userId, extensionId, proxyId)
        : Promise.resolve(false)
    );
  };

  const fetchWithSensitiveValues = async (
    extensionId: string,
    request: SensitiveFetchRequest
  ): Promise<Response> => {
    if (!login.userId.value) {
      throw new SensitiveSettingsError(
        "signed_out",
        "Sensitive settings are only available while signed in."
      );
    }
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      throw new SensitiveSettingsError(
        "invalid_url",
        `${String(request.url)} is not a valid URL.`
      );
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new SensitiveSettingsError(
        "invalid_url",
        "Sensitive values can only be sent to an https URL without credentials."
      );
    }
    const userId = await waitForLoaded();
    if (!userId) {
      throw new SensitiveSettingsError(
        "not_loaded",
        "This account's sensitive settings couldn't be loaded."
      );
    }
    const host = normalizeSensitiveHost(url.host);
    const candidates = Object.entries(getMeta(extensionId)?.sensitive ?? {})
      .filter(([id, proxy]) => {
        const chosen = currentPointer(extensionId, id)?.host;
        return (
          normalizeSensitiveHost(proxy.host) === host ||
          (chosen !== undefined && normalizeSensitiveHost(chosen) === host)
        );
      })
      .filter(([id]) => request.proxy === undefined || id === request.proxy);
    if (candidates.length === 0) {
      throw new SensitiveSettingsError(
        "unknown_destination",
        `${extensionId} declares no sensitive settings for ${host}.`
      );
    }
    if (candidates.length > 1) {
      throw new SensitiveSettingsError(
        "ambiguous_destination",
        `More than one sensitive entry declares ${host}; pass \`proxy\` to pick one.`
      );
    }
    const [proxyId] = candidates[0]!;
    const pointer = currentPointer(extensionId, proxyId);
    if (!pointer) {
      throw new SensitiveSettingsError(
        "not_set",
        `No sensitive values are set for ${host}.`
      );
    }
    // Everything past here is reported as `request_failed`, so an extension
    // branching on `code` never meets a bare network error from the SDK, or
    // the RangeError / TypeError `Response` throws for a status outside
    // 200–599 or a header value it won't accept.
    let result: Awaited<ReturnType<typeof os.proxyRequest>>;
    try {
      result = await os.proxyRequest(pointer.recordName, pointer.address, {
        path: url.pathname + url.search,
        method: request.method ?? "GET",
        body: request.body,
      });
    } catch (error) {
      throw new SensitiveSettingsError(
        "request_failed",
        `The request couldn't be sent: ${String(error)}`
      );
    }
    if (!result.success) {
      throw new SensitiveSettingsError(
        "request_failed",
        `${result.errorCode}: ${result.errorMessage}`
      );
    }
    const { statusCode, headers, body } = result.response;
    try {
      return new Response(NULL_BODY_STATUSES.has(statusCode) ? null : body, {
        status: statusCode,
        headers,
      });
    } catch (error) {
      throw new SensitiveSettingsError(
        "request_failed",
        `The response couldn't be read: ${String(error)}`
      );
    }
  };

  effect(() => {
    const userId = login.userId.value;
    if (userId === loadedUserId) {
      return;
    }
    pointers.value = {};
    loadedUserId = null;
    if (userId) {
      currentLoad = load(userId).catch((error: unknown) => {
        console.error("Failed to load extension sensitive settings:", error);
      });
    }
  });

  return {
    sensitiveProxiesByExtensionId: pointers,
    isSensitiveValueSet,
    getSensitiveDestination,
    hasStoredSensitiveValues,
    getUnusedSensitiveProxies,
    setSensitiveValues,
    clearSensitiveValues,
    fetchWithSensitiveValues,
  };
}
