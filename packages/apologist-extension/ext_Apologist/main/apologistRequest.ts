import type { SeedBibleState } from "seed-bible";
import {
  SensitiveSettingsError,
  type SensitiveSettingsErrorCode,
} from "@packages/seed-bible/seed-bible/managers/ExtensionSensitiveSettings";

export const APOLOGIST_EXTENSION_ID = "ext_Apologist";

/** Must match `sensitive.apologist.host` in `extension.json`. */
export const DEFAULT_APOLOGIST_DOMAIN = "apologist.seedbible.io";

// The codes that mean "this viewer has no proxy to use", as opposed to a proxy
// that exists but whose request failed.
const NO_PROXY_CODES: ReadonlySet<SensitiveSettingsErrorCode> = new Set([
  "signed_out",
  "not_loaded",
  "not_set",
]);

export interface ApologistRequestInit {
  method?: "GET" | "POST";
  /** Sent as JSON. */
  body?: unknown;
  /**
   * Extra headers for a regular request. The proxy can't send them: it only
   * sends the headers its saved values fill in.
   */
  headers?: Record<string, string>;
  /**
   * How a regular (non-proxy) request passes the API key. The proxy can only
   * fill in `Authorization`, so proxied requests always send a bearer token.
   */
  apiKeyHeader?: "authorization" | "x-api-key";
}

export type ApologistRequest = (
  path: string,
  init?: ApologistRequestInit
) => Promise<Response>;

/**
 * Sends requests to the Apologist agent. When the viewer has saved an API key
 * in this extension's settings, the request goes through their CasualOS proxy,
 * which adds the key on the server and sends it to the host they chose.
 * Otherwise it's a regular request to `domain`, with `apiKey` (from the URL)
 * if there is one.
 */
export function createApologistRequest(
  context: SeedBibleState,
  options: { domain: string; apiKey: string | null }
): ApologistRequest {
  return async (path, init = {}) => {
    const method = init.method ?? "GET";
    try {
      return await context.extensionSettings.fetchWithSensitiveValues(
        APOLOGIST_EXTENSION_ID,
        {
          url: `https://${DEFAULT_APOLOGIST_DOMAIN}${path}`,
          method,
          body: init.body,
        }
      );
    } catch (error) {
      if (
        !(error instanceof SensitiveSettingsError) ||
        !NO_PROXY_CODES.has(error.code)
      ) {
        throw error;
      }
    }

    const headers: Record<string, string> = { ...init.headers };
    if (options.apiKey) {
      if (init.apiKeyHeader === "x-api-key") {
        headers["x-api-key"] = options.apiKey;
      } else {
        headers["Authorization"] = `Bearer ${options.apiKey}`;
      }
    }
    return fetch(`https://${options.domain}${path}`, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  };
}
