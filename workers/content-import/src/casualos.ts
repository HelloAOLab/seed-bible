import {
  ContentLibraryError,
  type ContentRecordStore,
  type StoreResult,
} from "../../../packages/seed-bible/seed-bible/managers/customContent/publish";

/**
 * Error codes meaning the session key is dead for good. Mirrors
 * `FATAL_SESSION_ERROR_CODES` in the app's `SessionGuard.ts`, and is just as
 * narrow on purpose: a network blip or `server_error` happens to a perfectly
 * good session, and must be retried, not treated as a sign-out.
 */
export const FATAL_SESSION_ERROR_CODES: readonly string[] = [
  "session_expired",
  "invalid_key",
  "user_is_banned",
];

/** Failures worth retrying: the same call may well work in a moment. */
const TRANSIENT_ERROR_CODES: readonly string[] = [
  "server_error",
  "network_error",
  "rate_limit_exceeded",
  "invalid_response",
];

export function isFatalSessionError(code: string): boolean {
  return FATAL_SESSION_ERROR_CODES.includes(code);
}

export function isTransientError(code: string): boolean {
  return TRANSIENT_ERROR_CODES.includes(code) || code.startsWith("http_5");
}

export type ProcedureResult =
  | ({ success: true } & Record<string, unknown>)
  | { success: false; errorCode: string; errorMessage?: string };

export interface LinkPreview {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

/**
 * CasualOS's records API, called the way the SDK's `RecordsClient` does:
 * one `POST {endpoint}/api/v3/callProcedure` per call, as the owner of
 * `sessionKey`. The worker never has access of its own.
 */
export function createCasualOSClient(
  endpoint: string,
  sessionKey: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args)
) {
  const root = endpoint.replace(/\/+$/, "");

  const call = async (
    procedure: string,
    input: Record<string, unknown>
  ): Promise<ProcedureResult> => {
    let response: Response;
    try {
      response = await fetchImpl(`${root}/api/v3/callProcedure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Accept: "application/json",
          Authorization: `Bearer ${sessionKey}`,
        },
        body: JSON.stringify({ procedure, input }),
      });
    } catch (error) {
      return {
        success: false,
        errorCode: "network_error",
        errorMessage: String(error),
      };
    }
    const json = (await response.json().catch(() => null)) as {
      success?: unknown;
      errorCode?: unknown;
      errorMessage?: unknown;
    } | null;
    if (!json || typeof json.success !== "boolean") {
      return {
        success: false,
        errorCode: response.ok ? "invalid_response" : `http_${response.status}`,
      };
    }
    if (!json.success) {
      return {
        success: false,
        errorCode: String(json.errorCode ?? "server_error"),
        errorMessage:
          typeof json.errorMessage === "string" ? json.errorMessage : undefined,
      };
    }
    return json as { success: true } & Record<string, unknown>;
  };

  const asStoreResult = (result: ProcedureResult): StoreResult =>
    result.success
      ? { success: true, data: result.data }
      : {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        };

  const listByMarker = async (
    recordName: string,
    marker: string
  ): Promise<{ address: string; data: unknown }[]> => {
    const all: { address: string; data: unknown }[] = [];
    let address: string | undefined;
    // Each page continues after the last address the one before returned.
    for (;;) {
      const page = await call("listData", {
        recordName,
        marker,
        ...(address ? { address } : {}),
      });
      if (!page.success) {
        // The shared publishing code reads this error type's code.
        throw new ContentLibraryError(page.errorCode, "Listing data failed.");
      }
      const items = (page.items ?? []) as { address: string; data: unknown }[];
      if (items.length === 0) {
        return all;
      }
      all.push(...items.map((i) => ({ address: i.address, data: i.data })));
      const total =
        typeof page.totalCount === "number" ? page.totalCount : null;
      if (total !== null && all.length >= total) {
        return all;
      }
      address = items[items.length - 1]!.address;
    }
  };

  const store: ContentRecordStore = {
    getData: async (recordName, address) =>
      asStoreResult(await call("getData", { recordName, address })),
    recordData: async (recordKey, address, data, marker) =>
      asStoreResult(
        await call("recordData", {
          recordKey,
          address,
          data,
          markers: [marker],
        })
      ),
    eraseData: async (recordKey, address) =>
      asStoreResult(await call("eraseData", { recordKey, address })),
    listByMarker,
  };

  return {
    store,
    /** Succeeds only for a live session that belongs to `userId`. */
    getUserInfo: (userId: string) => call("getUserInfo", { userId }),
    getLinkPreview: async (url: string): Promise<LinkPreview | null> => {
      const result = await call("getLinkPreview", { url });
      if (!result.success) {
        if (isFatalSessionError(result.errorCode)) {
          throw new CasualOSError(result.errorCode, "The session has ended.");
        }
        // A page that can't be previewed still becomes an item; the owner
        // fills in what's missing.
        return null;
      }
      const text = (value: unknown) =>
        typeof value === "string" && value.trim() ? value.trim() : undefined;
      return {
        title: text(result.title),
        description: text(result.description),
        imageUrl: text(result.imageUrl),
        siteName: text(result.siteName),
      };
    },
  };
}

export type CasualOSClient = ReturnType<typeof createCasualOSClient>;

/** A CasualOS call that failed; `code` is CasualOS's error code. */
export class CasualOSError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "CasualOSError";
  }
}
