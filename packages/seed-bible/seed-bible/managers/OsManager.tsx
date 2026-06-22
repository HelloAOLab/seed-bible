import { RemoteYjsSharedDocument } from "@casual-simulation/aux-common/documents/RemoteYjsSharedDocument";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import { SocketManager as WebsocketManager } from "@casual-simulation/websocket";
import { WebsocketConnectionClient } from "@casual-simulation/aux-websocket";
import stringify from "@casual-simulation/fast-json-stable-stringify";
import axios from "axios";
import { isArrayBuffer } from "es-toolkit";
import { v4 as uuid } from "uuid";
import type { RecordFileFailure } from "@casual-simulation/aux-records";
import { InstRecordsClient } from "@casual-simulation/aux-common/websockets/InstRecordsClient";
import { PartitionAuthSource } from "@casual-simulation/aux-common/partitions/PartitionAuthSource";
import { AuthenticatedConnectionClient } from "@casual-simulation/aux-common/websockets/AuthenticatedConnectionClient";
import { computed, effect, signal } from "@preact/signals";
import { parseSessionKey } from "@casual-simulation/aux-common";
import { sha256 } from "hash.js";

export type CasualOSManager = ReturnType<typeof CasualOSManager>;

export interface UserInfo {
  id: string;
  email: string;
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

export function CasualOSManager(endpoint: string = "https://auth.ao.bot") {
  const client = createRecordsClient(endpoint);
  const connectionId = uuid();
  let currentWakeLock: WakeLockSentinel | null = null;

  let instRecordsClient: InstRecordsClient | null = null;
  let authSource: PartitionAuthSource | null = null;

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

  function getInstClient(): InstRecordsClient {
    if (!instRecordsClient) {
      const url = new URL("wss://auth.ao.bot");
      const manager = new WebsocketManager(url);
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
        // TODO: handle other message types and error cases
        if (message.type === "request") {
          if (message.kind === "need_indicator") {
            // TODO: Support returning connection tokens
            source.sendAuthResponse({
              type: "response",
              success: true,
              origin: message.origin,
              indicator: {
                connectionId: connectionId,
              },
            });
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
    options?: { markers?: string[] }
  ): Promise<SharedDocument> {
    const client = getInstClient();
    const authSource = getAuthSource();
    const doc = new RemoteYjsSharedDocument(client, authSource, {
      recordName,
      inst,
      branch: `doc/${docName}`,
      markers: options?.markers ? options.markers : undefined,
    });

    await doc.init();

    return doc;
  }

  effect(() => {
    client.sessionKey = sessionKey.value as string;
  });

  return {
    client,
    connectionId,
    sessionKey,
    parsedSessionKey,
    connectionKey,

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

    listDataByMarker: async (
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
    },

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
  let encodedData: Uint8Array;
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

    const uploadResult = await axios.request({
      method: method.toLowerCase(),
      url: url,
      headers: headers,
      data: encodedData,
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error("Failed to upload file.");
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
