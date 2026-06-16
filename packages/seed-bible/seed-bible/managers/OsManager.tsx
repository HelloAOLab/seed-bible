import { RemoteYjsSharedDocument } from "@casual-simulation/aux-common/documents/RemoteYjsSharedDocument";
import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient";
import { SocketManager as WebsocketManager } from "@casual-simulation/websocket";
import { WebsocketConnectionClient } from "@casual-simulation/aux-websocket";
import stringify from "@casual-simulation/fast-json-stable-stringify";
import axios from "axios";
import { isArrayBuffer } from "es-toolkit";
import { v4 as uuid } from "uuid";
import type {
  CompleteLoginResult,
  LoginRequestResult,
  LoginRequestSuccess,
  RecordFileFailure,
} from "@casual-simulation/aux-records";
import { InstRecordsClient } from "@casual-simulation/aux-common/websockets/InstRecordsClient";
import { PartitionAuthSource } from "@casual-simulation/aux-common/partitions/PartitionAuthSource";
import { AuthenticatedConnectionClient } from "@casual-simulation/aux-common/websockets/AuthenticatedConnectionClient";
import { computed, signal } from "@preact/signals";
import { parseSessionKey } from "@casual-simulation/aux-common";

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

// function r

export function CasualOSManager(endpoint: string = "https://auth.ao.bot") {
  const client = createRecordsClient(endpoint);
  const connectionId = uuid();

  let instRecordsClient: InstRecordsClient | null = null;
  let authSource: PartitionAuthSource | null = null;

  const isLoginOpen = signal(false);
  const sessionKey = signal<string | null>(null);
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
  const connectionKey = signal<string | null>(null);
  const userId = computed(() => parsedSessionKey.value?.userId ?? null);
  const userInfo = signal<UserInfo | null>(null);
  const currentLoginRequest = signal<LoginRequestSuccess | null>(null);

  let loginPromise: Promise<UserInfo | null> | null = null;
  let resolveLoginPromise: ((value: UserInfo | null) => void) | null = null;
  let rejectLoginPromise: ((err: Error) => void) | null = null;
  let currentLoginPromise: Promise<UserInfo | null> | null = null;

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

  async function cancelLogin() {
    if (loginPromise && rejectLoginPromise) {
      rejectLoginPromise(new Error("Login cancelled"));
      loginPromise = null;
      resolveLoginPromise = null;
      rejectLoginPromise = null;
    }
  }

  // async function
  async function requestLoginByEmail(
    email: string
  ): Promise<LoginRequestResult> {
    const result = await client.requestLogin({
      address: email,
      addressType: "email",
    });

    if (result.success) {
      currentLoginRequest.value = result;
    } else {
      currentLoginRequest.value = null;
    }

    return result;
  }

  async function submitEmailCode(
    code: string,
    request: LoginRequestSuccess
  ): Promise<CompleteLoginResult> {
    const result = await client.completeLogin({
      code,
      requestId: request.requestId,
      userId: request.userId,
    });

    currentLoginRequest.value = null;
    if (result.success) {
      sessionKey.value = result.sessionKey;
      connectionKey.value = result.connectionKey;
      client.sessionKey = result.sessionKey;

      await loadUserInfo();
    }

    return result;
  }

  async function loadUserInfo(): Promise<UserInfo | null> {
    if (!sessionKey.value || !userId.value) {
      return null;
    }
    const result = await client.getUserInfo({ userId: userId.value });
    if (result.success) {
      userInfo.value = {
        id: userId.value,
        email: result.email,
      };
      if (resolveLoginPromise) {
        resolveLoginPromise(userInfo.value);
        resolveLoginPromise = null;
        rejectLoginPromise = null;
        loginPromise = null;
      }

      return userInfo.value;
    } else {
      return null;
    }
  }

  async function loginCore(): Promise<UserInfo | null> {
    if (!sessionKey.value) {
      if (!loginPromise) {
        loginPromise = new Promise((resolve, reject) => {
          resolveLoginPromise = resolve;
          rejectLoginPromise = reject;
        });
      }

      // prompt for login
      try {
        isLoginOpen.value = true;
        return await loginPromise;
      } finally {
        isLoginOpen.value = false;
      }
    }

    return await loadUserInfo();
  }

  function login(): Promise<UserInfo | null> {
    if (userInfo.value) {
      return Promise.resolve(userInfo.value);
    }

    if (import.meta.env.SSR) {
      return Promise.resolve(null);
    }

    if (!currentLoginPromise) {
      currentLoginPromise = loginCore().finally(
        () => (currentLoginPromise = null)
      );
    }

    return currentLoginPromise;
  }

  async function loginInBackground(): Promise<UserInfo | null> {
    if (!sessionKey.value) {
      return null;
    }

    if (userInfo.value) {
      return userInfo.value;
    }

    return await login();
  }

  return {
    client,
    connectionId,

    requestLoginByEmail,
    submitEmailCode,
    cancelLogin,

    getData: async (recordName: string, address: string) => {
      const result = await client.getData({
        recordName,
        address,
      });

      if (result.success === true) {
        return result.data;
      } else {
        throw new Error(
          `Failed to get data for record ${recordName} at address ${address}: ${result.errorCode} ${result.errorMessage}`
        );
      }
    },

    recordData: async (
      recordKey: string,
      address: string,
      data: unknown,
      options: { marker?: string }
    ) => {
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

    requestAuthBot: (): Promise<UserInfo | null> => {
      return login();
    },

    requestAuthBotInBackground: (): Promise<UserInfo | null> => {
      return loginInBackground();
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
  return hash.sha256().update(buffer).digest("hex");
}
