import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import { SocketManager as WebsocketManager } from "@casual-simulation/websocket";
import { WebsocketConnectionClient } from "@casual-simulation/aux-websocket";
import stringify from "@casual-simulation/fast-json-stable-stringify";
import { isArrayBuffer } from "es-toolkit";
import { v4 as uuid } from "uuid";
import type { RecordFileFailure } from "@casual-simulation/aux-records";
import { InstRecordsClient } from "@casual-simulation/aux-common/websockets/InstRecordsClient";
import { PartitionAuthSource } from "@casual-simulation/aux-common/partitions/PartitionAuthSource";
import { AuthenticatedConnectionClient } from "@casual-simulation/aux-common/websockets/AuthenticatedConnectionClient";
import { computed, effect, signal } from "@preact/signals";
import {
  parseSessionKey,
  generateV1ConnectionToken,
} from "@casual-simulation/aux-common";
import type { SharedMarkerPermission } from "@casual-simulation/aux-common";
import { sha256 } from "hash.js";
import { first, firstValueFrom, timeout } from "rxjs";
import { guardRecordsClient } from "./SessionGuard";
import type { SessionInvalidatedEvent } from "./SessionGuard";

export type CasualOSManager = ReturnType<typeof CasualOSManager>;

export type {
  FatalSessionErrorCode,
  SessionInvalidatedEvent,
} from "./SessionGuard";
export { FATAL_SESSION_ERROR_CODES } from "./SessionGuard";

export interface UserInfo {
  id: string;
  email: string;
}

/**
 * The `beforeinstallprompt` event fired by Chromium browsers when the app is
 * eligible for installation. Not part of the standard TS DOM lib, so we declare
 * the shape we rely on here.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const UNSAFE_HEADERS = new Set([
  "accept-encoding",
  "referer",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "origin",
  "sec-ch-ua-platform",
  "user-agent",
  "sec-ch-ua-mobile",
  "sec-ch-ua",
  "content-length",
  "connection",
  "host",
]);

/**
 * Waits for a freshly-connected shared document to report itself synced, and
 * lets go of it if that never happens.
 *
 * The ordinary failures never report anything at all: an expired session or a
 * refused record turns the status to `authorization: false`, and a dropped
 * connection turns it to `sync: false`. Neither errors and neither completes the
 * stream, so with no deadline this waits for the rest of the page load — and so
 * does whoever asked for the document. A caller that can carry on without it
 * passes `timeoutMs` to turn that silence into a failure it can handle.
 *
 * Either way the document is already connected and watching its branch by the
 * time this runs, and a document nobody is going to be handed has to be
 * released: otherwise it keeps that watch for the rest of the page load, and a
 * caller that retries leaves another one behind on every attempt.
 */
export async function awaitDocumentSync(
  doc: Pick<SharedDocument, "onStatusUpdated" | "unsubscribe">,
  timeoutMs?: number
): Promise<void> {
  const synced = doc.onStatusUpdated.pipe(
    first((s) => s.type === "sync" && s.synced)
  );

  try {
    await firstValueFrom(
      timeoutMs === undefined
        ? synced
        : synced.pipe(timeout({ first: timeoutMs }))
    );
  } catch (error) {
    doc.unsubscribe();
    throw error;
  }
}

/**
 * Collects every page of a listing that pages by number from 0 and reports a
 * total, as the shared-permission listings do (unlike `listData`, which pages
 * by address). Throws when a page fails, matching `listAllData`.
 */
async function listAllPages<T>(
  label: string,
  fetchPage: (
    page: number
  ) => Promise<
    | { success: true; items: T[]; totalCount: number }
    | { success: false; errorCode: string }
  >
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; ; page++) {
    const result = await fetchPage(page);
    if (!result.success) {
      console.error(`Error listing ${label}:`, result);
      throw new Error(`Error listing ${label}: ${result.errorCode}`);
    }
    all.push(...result.items);
    // Stopping on an empty page too means a total that shrinks while we page
    // (someone revoking mid-listing) can't keep us asking for pages forever.
    if (result.items.length === 0 || all.length >= result.totalCount) {
      return all;
    }
  }
}

/**
 * Reads every page of a data listing, each continuing after the last address
 * the one before it returned. Throws on a failed page.
 */
async function listAllByAddress(
  fetchPage: (lastAddress: string | undefined) => Promise<
    | {
        success: true;
        items: { address: string; data: unknown }[];
        totalCount: number;
      }
    | { success: false; errorCode: string }
  >
): Promise<{ success: true; items: { address: string; data: unknown }[] }> {
  const allItems: { address: string; data: unknown }[] = [];
  let lastAddress: string | undefined;

  while (true) {
    const page = await fetchPage(lastAddress);

    if (!page.success) {
      console.error("Error listing data:", page);
      throw new Error(`Error listing data: ${page.errorCode}`);
    }

    if (page.items.length === 0) {
      break;
    }

    for (const item of page.items) {
      allItems.push({ address: item.address, data: item.data });
    }

    // Saves asking for the empty page that would otherwise end the loop.
    // Depending on the server's store, `totalCount` is either every item
    // listed or only those after `lastAddress`; reaching it means this was
    // the last page either way.
    if (allItems.length >= page.totalCount) {
      break;
    }

    lastAddress = page.items[page.items.length - 1]?.address;
  }

  return { success: true, items: allItems };
}

export function CasualOSManager(
  endpoint: string = "https://auth.seedbible.org"
) {
  const rawClient = createRecordsClient(endpoint);
  const connectionId = uuid();
  let currentWakeLock: WakeLockSentinel | null = null;

  // Captured `beforeinstallprompt` event, used to trigger the native PWA
  // install dialog on Chromium browsers. Only available once the browser deems
  // the app installable (never on iOS Safari, or if already installed).
  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (event) => {
      // Prevent the browser's default mini-infobar so we can trigger the
      // prompt from our own onboarding UI instead.
      event.preventDefault();
      deferredInstallPrompt = event as BeforeInstallPromptEvent;
    });
    window.addEventListener("appinstalled", () => {
      // The event is single-use and no longer valid once installed.
      deferredInstallPrompt = null;
    });
  }

  let instRecordsClient: InstRecordsClient | null = null;
  let authSource: PartitionAuthSource | null = null;

  /** Record sweeps still running, so concurrent callers share one. */
  const listAllDataInFlight = new Map<
    string,
    Promise<{ success: boolean; items: { address: string; data: unknown }[] }>
  >();

  const sessionKey = signal<string | null>(null);
  const connectionKey = signal<string | null>(null);

  const parsedSessionKey = computed(() => {
    const parsed = parseSessionKey(sessionKey.value);
    if (parsed) {
      return {
        userId: parsed[0],
        sessionId: parsed[1],
        sessionSecret: parsed[2],
        expireTimeMs: parsed[3],
      };
    } else {
      return null;
    }
  });

  /**
   * Fires when the records/auth API reports that our session key is dead — expired,
   * unrecognised, or the account is banned. `LoginManager` watches this and clears
   * the local session; `OsManager` makes no decision about the UI.
   */
  const sessionInvalidated = signal<SessionInvalidatedEvent | null>(null);
  let sessionInvalidatedCount = 0;

  const client = guardRecordsClient(rawClient, {
    getSessionKey: () => sessionKey.peek(),
    onSessionInvalidated: (errorCode) => {
      console.warn(`[OsManager] The session is no longer valid: ${errorCode}`);
      sessionInvalidated.value = {
        errorCode,
        id: ++sessionInvalidatedCount,
      };
    },
  });

  function getInstClient(): InstRecordsClient {
    if (!instRecordsClient) {
      const url = new URL("wss://auth.seedbible.org");
      const manager = new WebsocketManager(url);
      manager.init();
      const client = new WebsocketConnectionClient(manager.socket);
      const authSource = getAuthSource();
      const connection = new AuthenticatedConnectionClient(client, authSource);
      instRecordsClient = new InstRecordsClient(connection);

      connection.connect();
    }

    return instRecordsClient;
  }

  function getAuthSource(): PartitionAuthSource {
    if (!authSource) {
      const source = (authSource = new PartitionAuthSource());
      source.onAuthMessage.subscribe((message) => {
        const provideIndicator = (recordName: string | null, inst: string) => {
          const key = connectionKey.value;
          // Send response back asynchronously so that we can ensure the requester is listening for the response
          setTimeout(() => {
            let token: string | null = null;
            if (key) {
              token = generateV1ConnectionToken(
                key,
                connectionId,
                recordName,
                inst
              );
            }

            source.sendAuthResponse({
              type: "response",
              success: true,
              origin: message.origin,
              indicator: token
                ? {
                    connectionToken: token,
                  }
                : {
                    connectionId: connectionId,
                  },
            });
          });
        };

        // TODO: handle other message types and error cases
        if (message.type === "request") {
          if (
            message.kind === "need_indicator" ||
            message.kind === "invalid_indicator"
          ) {
            provideIndicator(null, "seed-bible");
          } else if (message.kind === "not_authorized") {
            console.log("Handling not_authorized message:", message);
            if (message.reason?.type === "invalid_token") {
              const recordName = message.resource?.recordName;
              const inst = message.resource?.inst;
              const branch = message.resource?.branch;

              if (!recordName || !inst || !branch) {
                console.log(
                  `[AuthCoordinator] Invalid token request missing recordName, inst, or branch`
                );
                return;
              }

              // Only allow automatically loading branches that start with 'doc/'
              // This is a temporary solution to prevent loading actual existing inst data and instead only allow loading
              // shared documents from other records
              if (!branch.startsWith("doc/")) {
                console.error(
                  `[AuthCoordinator] Invalid token request branch does not start with 'doc/'`
                );
                return;
              }

              provideIndicator(recordName, inst);
            }
          }
        }
      });
    }

    return authSource;
  }

  async function getSharedDocument(
    recordName: string | null,
    inst: string,
    docName: string,
    options?: { markers?: string[]; timeoutMs?: number }
  ): Promise<SharedDocument> {
    const client = getInstClient();
    const authSource = getAuthSource();
    // Shared documents are the only thing in the app that needs Yjs (~77 KB
    // with lib0), and they only come into play for multiplayer sessions — so
    // the module is fetched here rather than at boot. This function is already
    // async and already waits on a network sync, so the extra await is free.
    const { RemoteYjsSharedDocument } =
      await import("@casual-simulation/aux-common/documents/RemoteYjsSharedDocument");
    const doc = new RemoteYjsSharedDocument(client, authSource, {
      recordName,
      inst,
      branch: `doc/${docName}`,
      markers: options?.markers ? options.markers : undefined,
    });

    doc.connect();

    await awaitDocumentSync(doc, options?.timeoutMs);

    return doc;
  }

  /**
   * Forgets which peers the inst client thinks are connected to a shared
   * document's branch, so the next `repo/watch_branch_devices` is treated as
   * a fresh start.
   *
   * Workaround for a CasualOS client bug that permanently breaks presence
   * after a dropped connection: when the local socket goes down,
   * `InstRecordsClient` synthesizes a disconnect for every peer it knows
   * about but never removes them from its own `_connectedDevices` cache. On
   * reconnect it does re-request the device list, and the server does send
   * the full list back — but every replayed "connected" message is then
   * filtered out as a duplicate against that stale cache, so no peer (not
   * even ourselves) is ever reported as present again for the life of the
   * session. Clearing the cache first lets the replayed list through.
   *
   * Reaches into a private field, so it's written to quietly do nothing if a
   * future SDK version changes shape rather than throwing.
   */
  function clearBranchDeviceCache(
    recordName: string | null,
    inst: string,
    docName: string
  ): void {
    const internals = getInstClient() as unknown as {
      _connectedDevices?: Map<string, unknown>;
    };
    // Mirrors the SDK's own branch cache key: `${recordName ?? ""}/${inst}/${branch}`.
    const key = `${recordName ?? ""}/${inst}/doc/${docName}`;
    internals._connectedDevices?.delete?.(key);
  }

  effect(() => {
    client.sessionKey = sessionKey.value as string;
  });

  const listDataByMarker = async (
    // Despite the field's name, the records server resolves this the same
    // way it does a write's `recordKey` - either a bare record name or an
    // actual record key both work.
    recordName: string,
    marker: string,
    lastAddress?: string
  ) => {
    const result = await client.listData({
      recordName,
      marker,
      address: lastAddress,
    });

    return result;
  };

  return {
    client,
    connectionId,
    sessionKey,
    parsedSessionKey,
    connectionKey,
    clearBranchDeviceCache,
    sessionInvalidated,

    getData: async (recordName: string, address: string) => {
      const result = await client.getData({
        recordName,
        address,
      });

      return result;
    },

    recordData: async (
      recordKey: string,
      address: string,
      data: unknown,
      options: { marker?: string }
    ) => {
      console.log(
        `Recording data for record ${recordKey} at address ${address} with marker ${options.marker}:`,
        data
      );
      return await client.recordData({
        recordKey,
        address,
        data,
        markers: options.marker ? [options.marker] : undefined,
      });
    },

    eraseData: async (recordKey: string, address: string) => {
      return client.eraseData({
        recordKey,
        address,
      });
    },

    listDataByMarker,

    listAllDataByMarker: async (
      recordName: string,
      marker: string
    ): Promise<{
      success: boolean;
      items: { address: string; data: unknown }[];
    }> => {
      return listAllByAddress((lastAddress) =>
        listDataByMarker(recordName, marker, lastAddress)
      );
    },

    /**
     * Every data item in a record, paged by address.
     *
     * The marker-scoped listing above can't answer "everything of mine",
     * because some of what the app writes is marked per chapter — annotations
     * carry `publicRead:annotations/{book}/{chapter}`, so collecting them all
     * by marker would mean 1,189 requests. `listData` takes no marker and
     * walks the record itself, which is one paged sweep instead.
     *
     * Callers get raw `{ address, data }` and are expected to recognise their
     * own items, either by an address prefix or by parsing `data` with their
     * schema. Only items the caller may read come back.
     *
     * Concurrent sweeps of the same record share one set of requests: several
     * callers want different slices of the same items — annotations and
     * highlights, say — and each doing its own sweep would page the whole
     * record twice for the same answer.
     */
    listAllData: (
      recordName: string
    ): Promise<{
      success: boolean;
      items: { address: string; data: unknown }[];
    }> => {
      const existing = listAllDataInFlight.get(recordName);
      if (existing) {
        return existing;
      }

      const sweep = listAllByAddress((lastAddress) =>
        client.listData({ recordName, address: lastAddress })
      ).finally(() => {
        listAllDataInFlight.delete(recordName);
      });

      listAllDataInFlight.set(recordName, sweep);
      return sweep;
    },

    /**
     * Asks another user to share `permission` both ways: once they accept, each
     * of them holds it in the other's record.
     *
     * A target is required. An untargeted request can be accepted by whoever
     * reaches it first, so it would hand the grant to anyone holding its ID.
     */
    requestSharedPermission: (
      recordName: string,
      permission: SharedMarkerPermission,
      target: { userId: string } | { email: string },
      options?: { expireTimeMs?: number }
    ) =>
      client.requestSharedPermission({
        recordName,
        permission,
        targetUserId: "userId" in target ? target.userId : undefined,
        targetUserEmail: "email" in target ? target.email : undefined,
        expireTimeMs: options?.expireTimeMs,
      }),

    /**
     * Accepts a request sent to the signed-in user, granting the requester the
     * permission in `recordName` (the accepter's own record).
     *
     * Accepting a request that is already accepted reports success without
     * granting anything, so success alone doesn't prove a new share exists.
     */
    acceptSharedPermission: (sharedPermissionId: string, recordName: string) =>
      client.acceptSharedPermission({ sharedPermissionId, recordName }),

    /** Declines a request sent to the signed-in user. */
    rejectSharedPermission: (sharedPermissionId: string) =>
      client.rejectSharedPermission({ sharedPermissionId }),

    /**
     * Ends a share from either side, removing the grant from both records. The
     * requester can also use it to withdraw a request nobody has accepted yet.
     */
    revokeSharedPermission: (sharedPermissionId: string) =>
      client.revokeSharedPermission({ sharedPermissionId }),

    /** Every accepted share the signed-in user is part of, as the other party's record. */
    listAllSharedRecords: () =>
      listAllPages("shared records", async (page) => {
        const result = await client.listSharedRecords({ page });
        return result.success
          ? {
              success: true,
              items: result.sharedRecords,
              totalCount: result.totalCount,
            }
          : result;
      }),

    /** Every request the signed-in user has sent, in any status. */
    listAllSentSharedPermissions: () =>
      listAllPages("sent shared permissions", async (page) => {
        const result = await client.listSentSharedPermissions({ page });
        return result.success
          ? {
              success: true,
              items: result.sharedPermissions,
              totalCount: result.totalCount,
            }
          : result;
      }),

    /**
     * Every request ever sent to the signed-in user, in any status. Callers
     * wanting what still needs an answer must keep `status: "requested"` and
     * drop expired ones themselves; an expired request keeps that status.
     */
    listAllRequestedSharedPermissions: () =>
      listAllPages("requested shared permissions", async (page) => {
        const result = await client.listRequestedSharedPermissions({ page });
        return result.success
          ? {
              success: true,
              items: result.sharedPermissions,
              totalCount: result.totalCount,
            }
          : result;
      }),

    recordFile: async (
      recordKey: string,
      data: object | string | number | boolean,
      options: { mimeType?: string; marker?: string }
    ) => {
      const result = await uploadFile(
        recordKey,
        data,
        client,
        options.marker ? [options.marker] : undefined,
        options.mimeType
      );
      return {
        success: true,
        url: result.fileUrl,
      };
    },

    requestWakeLock: async () => {
      if ("wakeLock" in navigator) {
        try {
          currentWakeLock = await navigator.wakeLock.request("screen");
          currentWakeLock.addEventListener("release", () => {
            console.log("Wake Lock was released");
            currentWakeLock = null;
          });
          console.log("Wake Lock is active");
          return currentWakeLock;
        } catch (err) {
          console.error(`Unable to acquire Wake Lock:`, err);
        }
      }
      return null;
    },

    disableWakeLock: async () => {
      if (currentWakeLock) {
        await currentWakeLock.release();
        currentWakeLock = null;
        console.log("Wake Lock released");
      }
    },

    getSharedDocument,

    promptToInstallPWA: async (): Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }> => {
      if (!deferredInstallPrompt) {
        // No captured event: the browser doesn't support programmatic install
        // (e.g. iOS Safari), the app is already installed, or the prompt has
        // already been consumed.
        throw new Error("PWA installation is not available on this device");
      }

      const promptEvent = deferredInstallPrompt;
      // The event can only be used once — clear it before awaiting the choice.
      deferredInstallPrompt = null;

      await promptEvent.prompt();
      return promptEvent.userChoice;
    },
  };
}

/**
 * Uploads a file to the records server. Returns the URL of the file that was uploaded.
 * @param recordNameOrKey The name or key of the record to upload to.
 * @param data The data to upload
 * @param sessionKey The session key to use for authentication.
 */
export async function uploadFile(
  recordNameOrKey: string,
  data: object | string | number | boolean,
  client: ReturnType<typeof createRecordsClient>,
  markers: string[] = ["publicRead"],
  providedMimeType?: string
) {
  // Pinned to `ArrayBuffer` (rather than the default `ArrayBufferLike`) so it
  // satisfies `fetch`'s `BodyInit` when uploaded below. All three branches
  // already produce a plain-ArrayBuffer-backed view.
  let encodedData: Uint8Array<ArrayBuffer>;
  let mimeType: string;
  if (isArrayBuffer(data)) {
    encodedData = new Uint8Array(data);
    mimeType = providedMimeType || "application/octet-stream";
  } else if (data instanceof Blob) {
    encodedData = await data.bytes();
    mimeType = providedMimeType || data.type || "application/octet-stream";
  } else {
    const json = stringify(data);
    encodedData = new TextEncoder().encode(json);
    mimeType = providedMimeType || "application/json";
  }
  const byteLength = encodedData.byteLength;
  const hash = getHash(encodedData);

  const recordFileResult = await client.recordFile({
    recordKey: recordNameOrKey,
    fileSha256Hex: hash,
    fileMimeType: mimeType,
    fileByteLength: byteLength,
    markers: markers as [string, ...string[]],
  });

  let fileUrl: string;
  if (recordFileResult.success === false) {
    if (recordFileResult.errorCode !== "file_already_exists") {
      throw new Error(
        "Failed to record file: " +
          recordFileResult.errorCode +
          " " +
          recordFileResult.errorMessage
      );
    } else {
      fileUrl = (recordFileResult as RecordFileFailure).existingFileUrl!;
    }
  } else {
    const method = recordFileResult.uploadMethod;
    const url = (fileUrl = recordFileResult.uploadUrl);
    const headers = { ...recordFileResult.uploadHeaders };

    for (const header of UNSAFE_HEADERS) {
      delete headers[header];
    }

    const uploadResult = await fetch(url, {
      method,
      headers,
      body: encodedData,
    });

    if (!uploadResult.ok) {
      throw new Error(
        `Failed to upload file. (${uploadResult.status} ${uploadResult.statusText})`
      );
    } else {
      console.log("Successfully uploaded AUX file.");
    }
  }

  return {
    fileUrl,
    sha256Hash: hash,
  };
}

function getHash(buffer: Uint8Array): string {
  return sha256().update(buffer).digest("hex");
}
