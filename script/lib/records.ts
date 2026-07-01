import { createRequire } from "node:module";
import hash from "hash.js";
import axios from "axios";
import stringify from "@casual-simulation/fast-json-stable-stringify";
import { isArrayBuffer, isArrayBufferView } from "node:util/types";
import Conf from "conf";
import type { RecordFileFailure } from "@casual-simulation/aux-records";

// Loaded via createRequire rather than a static `import { createRecordsClient }`
// because the package ships as CJS with no exports map, and tsx's ESM named-export
// interop fails to bind the named export at link time (require() exposes it fine).
const { createRecordsClient } = createRequire(import.meta.url)(
  "@casual-simulation/aux-records/RecordsClient.js"
) as typeof import("@casual-simulation/aux-records/RecordsClient.js");

const headers = {
  Origin: "https://auth.ao.bot",
};

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
 * Gets the current session key for the user.
 * If they are not logged into ao.bot, then this will return null.
 */
export async function getCurrentSessionKey(): Promise<string | null> {
  // Get current session key
  const config = new Conf({
    projectName: "casualos-cli",
  });

  return (config.get(`https://api.ao.bot:sessionKey`) as string) || null;
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
  sessionKey: string,
  markers: string[] = ["publicRead"]
) {
  const client = createRecordsClient("https://api.ao.bot");

  client.sessionKey = sessionKey;

  let encodedData;
  let mimeType: string;
  if (isArrayBuffer(data) || isArrayBufferView(data)) {
    encodedData = data;
    mimeType = "application/octet-stream";
  } else {
    const json = stringify(data);
    encodedData = new TextEncoder().encode(json);
    mimeType = "application/json";
  }
  const byteLength = encodedData.byteLength;
  const hash = getHash(encodedData as Uint8Array);

  const recordFileResult = await client.recordFile(
    {
      recordKey: recordNameOrKey,
      fileSha256Hex: hash,
      fileMimeType: mimeType,
      fileByteLength: byteLength,
      markers: markers as [string, ...string[]],
    },
    {
      headers,
    }
  );

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
