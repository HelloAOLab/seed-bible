import {
  AuthenticatedConnectionClient,
  InstRecordsClient,
  PartitionAuthSource,
} from "@casual-simulation/aux-common";
import { RemoteYjsSharedDocument } from "@casual-simulation/aux-common/documents/RemoteYjsSharedDocument";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import { SocketManager as WebsocketManager } from "@casual-simulation/websocket";
import { WebsocketConnectionClient } from "@casual-simulation/aux-websocket";
import stringify from "@casual-simulation/fast-json-stable-stringify";
import axios from "axios";
import { isArrayBuffer } from "es-toolkit";
import { v4 as uuid } from "uuid";

export type CasualOSManager = ReturnType<typeof CasualOSManager>;

export interface UserInfo {
  id: string;
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

  let instRecordsClient: InstRecordsClient | null = null;
  let authSource: PartitionAuthSource | null = null;

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
        if (message.type === "request") {
          if (message.kind === "need_indicator") {
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

  return {
    client,
    connectionId,
    getData: async (recordName: string, address: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await client.getData({
        recordName,
        address,
      });

      if (result.success === true) {
        return result.data;
      } else {
        throw new Error(
          `Failed to get data for record ${recordName} at address ${address}: ${result.error}`
        );
      }
    },

    recordData: async (
      recordKey: string,
      address: string,
      data: unknown,
      options: { marker?: string }
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    requestAuthBot: async (): Promise<UserInfo | null> => {
      console.warn(
        "requestAuthBot is not implemented in this version of CasualOSManager"
      );
      return { id: "" };
    },

    requestAuthBotInBackground: async (): Promise<UserInfo | null> => {
      console.warn(
        "requestAuthBotInBackground is not implemented in this version of CasualOSManager"
      );
      return null;
    },

    signOut: async () => {
      console.warn(
        "signOut is not implemented in this version of CasualOSManager"
      );
    },

    requestWakeLock: async () => {
      console.warn(
        "requestWakeLock is not implemented in this version of CasualOSManager"
      );
    },

    disableWakeLock: async () => {
      console.warn(
        "disableWakeLock is not implemented in this version of CasualOSManager"
      );
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
  let encodedData;
  let mimeType: string = providedMimeType ?? "application/json";
  if (isArrayBuffer(data)) {
    encodedData = data;
    mimeType = "application/octet-stream";
  } else {
    const json = stringify(data);
    encodedData = new TextEncoder().encode(json);
    mimeType = "application/json";
  }
  const byteLength = encodedData.byteLength;
  const hash = getHash(encodedData as Uint8Array);

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
      fileUrl = recordFileResult.existingFileUrl!;
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
  return hash.sha256().update(buffer).digest("hex");
}
