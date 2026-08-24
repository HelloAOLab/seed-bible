// A small, Node-only reimplementation of the file-upload half of
// `packages/seed-bible/seed-bible/managers/OsManager.tsx`'s `uploadFile`,
// plus the one-time interactive login needed to mint a reusable API key.
// Not reused directly from `seed-bible/managers` — importing that barrel
// would eagerly evaluate all ~28 manager modules (several touch
// `indexedDB`/`localStorage`), which is a fragile foundation for a Node CLI
// that must never depend on browser globals. The upload protocol itself
// (`client.recordFile(...)` + a plain `fetch` PUT to a presigned URL) is
// small and stable enough to duplicate safely.
import { createInterface } from "node:readline/promises";
import { createRecordsClient } from "@casual-simulation/aux-records/RecordsClient.js";
import type { RecordFileFailure } from "@casual-simulation/aux-records";
import stringify from "@casual-simulation/fast-json-stable-stringify";
// Named imports from `hash.js` don't work under real (non-bundler) Node ESM —
// it's CJS-only with no static export analysis Node's interop can pick up —
// so its whole `module.exports` is taken as the default export instead.
import hashjs from "hash.js";
const { sha256 } = hashjs;

export type RecordsClient = ReturnType<typeof createRecordsClient>;

/** Matches `OsManager.tsx`'s own default — override via `SEED_BIBLE_ENDPOINT` for testing against a different instance. */
const DEFAULT_ENDPOINT = "https://auth.seedbible.org";

export function createClient(
  endpoint: string = process.env.SEED_BIBLE_ENDPOINT || DEFAULT_ENDPOINT
): RecordsClient {
  return createRecordsClient(endpoint);
}

// Headers `fetch` refuses to set itself — mirrors `OsManager.tsx`'s
// `UNSAFE_HEADERS` exactly, since the presigned-upload contract is the same.
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
 * Uploads a file record and returns its (publicly fetchable, given a
 * `publicRead` marker) URL. `data` is either raw bytes (the standalone JS
 * bundle) or a plain JSON-serializable object (the `ExtensionSet` manifest) —
 * the two shapes `seed-bible-extension-scripts publish` actually produces;
 * unlike `OsManager.tsx`'s version, there's no `Blob`/browser-`File` branch
 * to support here.
 */
export async function uploadFile(
  client: RecordsClient,
  recordKey: string,
  data: Uint8Array<ArrayBuffer> | object,
  markers: string[] = ["publicRead"],
  providedMimeType?: string
): Promise<{ fileUrl: string }> {
  // Pinned to `ArrayBuffer` (rather than the default `ArrayBufferLike`) so it
  // satisfies `fetch`'s `BodyInit` below — mirrors `OsManager.tsx`'s own
  // `uploadFile`.
  let encodedData: Uint8Array<ArrayBuffer>;
  let mimeType: string;
  if (data instanceof Uint8Array) {
    encodedData = data;
    mimeType = providedMimeType || "application/octet-stream";
  } else {
    encodedData = new TextEncoder().encode(stringify(data));
    mimeType = providedMimeType || "application/json";
  }

  const hash = sha256().update(encodedData).digest("hex");

  const recordFileResult = await client.recordFile({
    recordKey,
    fileSha256Hex: hash,
    fileMimeType: mimeType,
    fileByteLength: encodedData.byteLength,
    markers: markers as [string, ...string[]],
  });

  if (recordFileResult.success === false) {
    if (recordFileResult.errorCode !== "file_already_exists") {
      throw new Error(
        `Failed to record file: ${recordFileResult.errorCode} ${recordFileResult.errorMessage}`
      );
    }
    return {
      fileUrl: (recordFileResult as RecordFileFailure).existingFileUrl!,
    };
  }

  const { uploadMethod, uploadUrl } = recordFileResult;
  const headers = { ...recordFileResult.uploadHeaders };
  for (const header of UNSAFE_HEADERS) {
    delete headers[header];
  }

  const uploadResult = await fetch(uploadUrl, {
    method: uploadMethod,
    headers,
    body: encodedData,
  });
  if (!uploadResult.ok) {
    throw new Error(
      `Failed to upload file. (${uploadResult.status} ${uploadResult.statusText})`
    );
  }

  return { fileUrl: uploadUrl };
}

/**
 * One-time interactive login + record-key mint: prompts for an email address,
 * requests a login code, prompts for the code the user received by email,
 * completes the login, then mints a `subjectless` record key — a
 * self-contained bearer secret that works for `recordFile` (and other
 * records calls) with no session at all from then on. The caller is
 * responsible for telling the user to save the returned key (e.g. as
 * `SEED_BIBLE_RECORD_KEY`) so this never has to run again.
 */
export async function bootstrapRecordKey(
  client: RecordsClient
): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = await rl.question(
      "No SEED_BIBLE_RECORD_KEY set. Enter the email address for your Seed Bible account: "
    );

    const loginRequest = await client.requestLogin({
      address: email.trim(),
      addressType: "email",
      comId: "seed-bible",
    });
    if (!loginRequest.success) {
      throw new Error(
        `Failed to request a login code: ${loginRequest.errorCode} ${loginRequest.errorMessage}`
      );
    }

    const code = await rl.question("Enter the login code you were emailed: ");

    const completedLogin = await client.completeLogin({
      code: code.trim(),
      requestId: loginRequest.requestId,
      userId: loginRequest.userId,
    });
    if (!completedLogin.success) {
      throw new Error(
        `Failed to complete login: ${completedLogin.errorCode} ${completedLogin.errorMessage}`
      );
    }

    client.sessionKey = completedLogin.sessionKey;

    const createdKey = await client.createRecordKey({
      recordName: completedLogin.userId,
      policy: "subjectless",
    });
    if (!createdKey.success) {
      throw new Error(
        `Failed to create a record key: ${createdKey.errorCode} ${createdKey.errorMessage}`
      );
    }

    return createdKey.recordKey;
  } finally {
    rl.close();
  }
}
