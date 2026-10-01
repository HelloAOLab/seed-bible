import type { ProcessOpenIDAuthorizationCodeFailure } from "@casual-simulation/aux-records/AuthController";
import type { CasualOSManager } from "./OsManager";

/**
 * Where YouVersion sends the sign-in window back to. Must match the redirect
 * URI configured for the `youversion` provider on the auth server.
 */
export const YOUVERSION_CALLBACK_PATH = "/oauth/youversion/callback";

/**
 * YouVersion's own callback endpoint. Its first redirect back to us carries
 * only `state`; the authorization code is only handed out once that state is
 * replayed here, which redirects back to us again with `code` and `state`.
 */
export const YOUVERSION_AUTH_CALLBACK_URL =
  "https://api.youversion.com/auth/callback";

/**
 * Channel the callback page uses to tell the window that started the login
 * how it went. Same-origin only, and unlike `window.opener` it survives the
 * sign-in window passing through the provider's site.
 */
export const OPEN_ID_CALLBACK_CHANNEL = "sb-openid-login";

export type OpenIDCallbackMessage =
  | { type: "processed" }
  | {
      type: "failed";
      errorCode: ProcessOpenIDAuthorizationCodeFailure["errorCode"];
      errorMessage: string;
    };

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
 * Runs the callback page inside the sign-in window: either sends it on to
 * YouVersion for the authorization code, or hands that code to the auth
 * server and closes the window. The window that opened it finishes the login.
 */
export async function handleOpenIDCallback({
  os,
  search,
  navigate,
  close,
}: {
  os: Pick<CasualOSManager, "client">;
  search: string;
  navigate: (url: string) => void;
  close: () => void;
}): Promise<void> {
  const step = decideOpenIDCallbackStep(search);

  if (step.type === "forward") {
    navigate(step.url);
    return;
  }

  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(OPEN_ID_CALLBACK_CHANNEL);
  const notify = (message: OpenIDCallbackMessage) => {
    channel?.postMessage(message);
  };

  try {
    if (step.type === "process") {
      let message: OpenIDCallbackMessage;
      try {
        const result = await os.client.processOAuthCode({
          code: step.code,
          state: step.state,
        });
        message = result.success
          ? { type: "processed" }
          : {
              type: "failed",
              errorCode: result.errorCode,
              errorMessage: result.errorMessage,
            };
      } catch (err) {
        console.error("[OpenIDCallback] Failed to process the login.", err);
        message = {
          type: "failed",
          errorCode: "server_error",
          errorMessage: "The login could not be completed.",
        };
      }
      notify(message);
    } else if (step.type === "invalid") {
      notify({
        type: "failed",
        errorCode: "invalid_request",
        errorMessage: "The sign-in callback was missing its state.",
      });
    }
    // A denied login (e.g. the user declined on YouVersion) needs no message:
    // the window closing is already read as the user backing out.
  } finally {
    channel?.close();
    close();
  }
}
