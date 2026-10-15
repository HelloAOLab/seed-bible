import * as z from "zod/v4";
import type { CasualOSManager } from "./OsManager";

/**
 * Where the provider sends the browser back to. Must match the redirect URI
 * configured for the provider on the auth server.
 */
export const OPEN_ID_CALLBACK_PATH = "/oauth/redirect";

/**
 * Whether `pathname` is the callback page, under this deployment's base path.
 * This decides whether the app starts at all, so it has to match before the
 * reader gets a chance to replace an unknown path with a chapter URL.
 */
export function isOpenIDCallbackPath(
  basePath: string,
  pathname: string
): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return normalized === `${basePath}${OPEN_ID_CALLBACK_PATH}`;
}

/**
 * YouVersion's own callback endpoint. Its first redirect back to us carries
 * only `state`; the authorization code is only handed out once that state is
 * replayed here, which redirects back to us again with `code` and `state`.
 */
export const YOUVERSION_AUTH_CALLBACK_URL =
  "https://api.youversion.com/auth/callback";

/**
 * How long a saved login request is worth keeping. Matches the lifetime of
 * the login request on the auth server, after which it can never complete.
 */
export const OPEN_ID_LOGIN_REQUEST_LIFETIME_MS = 20 * 60 * 1000;

export const PENDING_OPEN_ID_LOGIN_STORAGE_KEY = "sb-openid-login-request";

const pendingOpenIDLoginSchema = z.object({
  /** The auth server's id for the login request; null if it was lost. */
  requestId: z.string().nullable(),
  /** The app page to return to once the provider is done. */
  returnUrl: z.string(),
  expireTimeMs: z.number(),
  /** Set by the callback page once the auth server has the code. */
  codeProcessed: z.boolean().optional(),
  /** Set by the callback page when the login can't go any further. */
  error: z
    .object({
      errorCode: z.string(),
      errorMessage: z.string(),
    })
    .optional(),
});

/**
 * A login with an OpenID provider that is in progress across the redirects
 * to the provider and back, which each reload the page.
 */
export type PendingOpenIDLogin = z.infer<typeof pendingOpenIDLoginSchema>;

export function readPendingOpenIDLogin(
  storage: Storage
): PendingOpenIDLogin | null {
  try {
    const raw = storage.getItem(PENDING_OPEN_ID_LOGIN_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = pendingOpenIDLoginSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser refuses the write (e.g. storage is full). */
export function writePendingOpenIDLogin(
  storage: Storage,
  pending: PendingOpenIDLogin
): boolean {
  try {
    storage.setItem(PENDING_OPEN_ID_LOGIN_STORAGE_KEY, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingOpenIDLogin(storage: Storage): void {
  try {
    storage.removeItem(PENDING_OPEN_ID_LOGIN_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/**
 * Only same-site paths are followed, so a tampered-with saved login can't
 * send the user to another site.
 */
function safeReturnUrl(returnUrl: string, fallbackUrl: string): string {
  return returnUrl.startsWith("/") && !returnUrl.startsWith("//")
    ? returnUrl
    : fallbackUrl;
}

/** What the callback page should do with the query string it was given. */
export type OpenIDCallbackStep =
  | { type: "forward"; url: string }
  | { type: "process"; code: string; state: string }
  | { type: "denied"; error: string }
  | { type: "invalid" };

export function decideOpenIDCallbackStep(search: string): OpenIDCallbackStep {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  if (error) {
    return { type: "denied", error };
  }

  const state = params.get("state");
  if (!state) {
    return { type: "invalid" };
  }

  const code = params.get("code");
  if (code) {
    return { type: "process", code, state };
  }

  // Every parameter goes along, not just `state`: YouVersion may add others
  // (e.g. `granted_permissions`) that it expects to see again.
  const url = new URL(YOUVERSION_AUTH_CALLBACK_URL);
  params.forEach((value, key) => url.searchParams.set(key, value));
  return { type: "forward", url: url.toString() };
}

/**
 * Runs the callback page: either sends the browser on to YouVersion for the
 * authorization code, or hands that code to the auth server and returns to
 * the page the login started from, where `LoginManager` finishes the login
 * with the saved request id.
 */
export async function handleOpenIDCallback({
  os,
  search,
  storage,
  navigate,
  fallbackUrl,
}: {
  os: Pick<CasualOSManager, "client">;
  search: string;
  storage: Storage;
  navigate: (url: string) => void;
  /** Where to go if the login didn't record a page to return to. */
  fallbackUrl: string;
}): Promise<void> {
  const step = decideOpenIDCallbackStep(search);

  if (step.type === "forward") {
    navigate(step.url);
    return;
  }

  const pending = readPendingOpenIDLogin(storage) ?? {
    requestId: null,
    returnUrl: fallbackUrl,
    expireTimeMs: Date.now() + OPEN_ID_LOGIN_REQUEST_LIFETIME_MS,
  };
  const returnUrl = safeReturnUrl(pending.returnUrl, fallbackUrl);
  const fail = (errorCode: string, errorMessage: string) => {
    writePendingOpenIDLogin(storage, {
      ...pending,
      error: { errorCode, errorMessage },
    });
  };

  if (step.type === "denied") {
    // The user backed out on the provider's side; nothing to report.
    clearPendingOpenIDLogin(storage);
  } else if (step.type === "invalid") {
    fail("invalid_request", "The sign-in callback was missing its state.");
  } else if (!pending.requestId) {
    // Without the request id the login can never be completed, so there is
    // no point handing over the code.
    fail(
      "invalid_request",
      "The login request was not found. Please try again."
    );
  } else {
    try {
      const result = await os.client.processOAuthCode({
        code: step.code,
        state: step.state,
      });
      if (result.success) {
        writePendingOpenIDLogin(storage, { ...pending, codeProcessed: true });
      } else {
        fail(result.errorCode, result.errorMessage);
      }
    } catch (err) {
      console.error("[OpenIDCallback] Failed to process the login.", err);
      fail("server_error", "The login could not be completed.");
    }
  }

  navigate(returnUrl);
}
