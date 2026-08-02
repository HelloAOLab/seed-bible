/**
 * The error codes that definitively mean the session key we sent is dead and will
 * never work again: it has expired, the server doesn't recognise it (for example
 * the session was revoked from another device), or the account has been suspended.
 *
 * Deliberately narrow. `server_error`, `rate_limit_exceeded`, `not_authorized`,
 * `not_logged_in` and thrown network errors all happen to a perfectly good session
 * on a flaky mobile connection, and signing someone out over one of those is much
 * worse than doing nothing. The same reasoning is already written into
 * `LoginManager.getUserProfile` and into `twitchPub-extension`'s session check,
 * which reports "still valid" on a network error precisely so a blip can't log
 * anyone out.
 *
 * Two codes look like they belong here and deliberately don't. Both were checked
 * against the SDK's implementation rather than its types, because this repo's patch
 * widens `ValidateSessionKeyFailure['errorCode']` to `KnownErrorCodes` and so makes the
 * types admit every code in the SDK:
 *
 * - `session_not_found` (HTTP 404) is returned from one place only, `revokeSession`,
 *   and only *after* `validateSessionKey` has already succeeded — so seeing it proves
 *   our key is alive. It means "the {userId, sessionId} you asked about doesn't exist".
 *   Adding it would sign a user out for querying a stale session id, which an extension
 *   can do through `os.client`. When our *own* session row is missing the server
 *   returns `invalid_key`, which is in the list above.
 *
 * - `unacceptable_session_key` (HTTP 400) is an argument-shape complaint raised before
 *   any lookup: the key isn't a non-empty string, or it failed to parse. For our
 *   ambient key it's unreachable — the guard below skips requests with no key, and
 *   `LoginManager` discards an unparseable stored key at startup rather than sending
 *   it. Its remaining cases are a malformed `sessionKey` passed explicitly by a caller.
 */
export declare const FATAL_SESSION_ERROR_CODES: readonly [
  "session_expired",
  "invalid_key",
  "user_is_banned",
];
export type FatalSessionErrorCode = (typeof FATAL_SESSION_ERROR_CODES)[number];
/**
 * Published when the records API reports that our session key is dead.
 */
export interface SessionInvalidatedEvent {
  /** The code the server answered with. */
  errorCode: FatalSessionErrorCode;
  /**
   * Monotonically increasing id. Subscribers watch the whole object, and signals
   * skip notifying when the new value is `===` the old one — so without the id a
   * second `session_expired` (after signing back in, say) would silently fail to
   * notify anyone.
   */
  id: number;
}
export interface SessionGuardOptions {
  /** Reads the session key currently attached to outgoing requests. */
  getSessionKey: () => string | null;
  /** Called when a request fails in a way that means the session is over. */
  onSessionInvalidated: (errorCode: FatalSessionErrorCode) => void;
}
/**
 * Wraps the records client so that every API call is checked for the error codes
 * that mean the session is over.
 *
 * Doing this once, here, is what saves the check from having to be repeated at each
 * of the dozens of call sites — and what makes it apply to calls that don't exist
 * yet, including the ones extensions make directly through `os.client`. The CasualOS
 * SDK offers no interceptor, callback or observable of its own (only a `sessionKey`
 * setter), and its client is a Proxy that turns any property access into a network
 * call, so there is no list of methods to wrap. Putting our own Proxy in front of it
 * is the only way to see every response.
 */
export declare function guardRecordsClient<T extends object>(
  client: T,
  { getSessionKey, onSessionInvalidated }: SessionGuardOptions
): T;
