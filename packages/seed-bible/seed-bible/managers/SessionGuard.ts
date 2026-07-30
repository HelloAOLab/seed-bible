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
export const FATAL_SESSION_ERROR_CODES = [
  "session_expired",
  "invalid_key",
  "user_is_banned",
] as const;

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

/**
 * Methods whose failures must never trigger an automatic sign-out.
 *
 * `revokeSession` is only ever called by a deliberate sign-out, whose entire job is
 * to end the session. It frequently comes back `session_expired` — the key was
 * already dead, which is often *why* the user is signing out — and reacting to that
 * would tell someone who just pressed "Sign out" that their session had expired.
 */
const IGNORED_METHODS: ReadonlySet<string> = new Set(["revokeSession"]);

/**
 * Properties that are read and written as plain data rather than called. The records
 * client is itself a Proxy that synthesizes a function for any property name it
 * doesn't recognise, so we short-circuit the ones we know are data to be certain
 * `client.sessionKey` never comes back as a synthesized function.
 */
const DATA_PROPERTIES: ReadonlySet<string> = new Set(["sessionKey"]);

export interface SessionGuardOptions {
  /** Reads the session key currently attached to outgoing requests. */
  getSessionKey: () => string | null;

  /** Called when a request fails in a way that means the session is over. */
  onSessionInvalidated: (errorCode: FatalSessionErrorCode) => void;
}

/**
 * Picks out the "this session is dead" code from an API result, or null if the
 * result is a success, a different failure, or not a result object at all
 * (streaming procedures resolve to an async generator, for instance).
 */
function findFatalSessionErrorCode(
  value: unknown
): FatalSessionErrorCode | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const result = value as { success?: unknown; errorCode?: unknown };
  if (result.success !== false || typeof result.errorCode !== "string") {
    return null;
  }

  return (FATAL_SESSION_ERROR_CODES as readonly string[]).includes(
    result.errorCode
  )
    ? (result.errorCode as FatalSessionErrorCode)
    : null;
}

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
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
export function guardRecordsClient<T extends object>(
  client: T,
  { getSessionKey, onSessionInvalidated }: SessionGuardOptions
): T {
  return new Proxy(client, {
    get(target, property) {
      // Symbols are never API methods (Symbol.toPrimitive, Symbol.iterator, ...).
      if (typeof property === "symbol" || DATA_PROPERTIES.has(property)) {
        return Reflect.get(target, property);
      }

      const value = Reflect.get(target, property);
      if (typeof value !== "function") {
        // Plain data passes straight through. This is also what preserves the
        // SDK's deliberately-`undefined` `then`/`catch`, which stop its client
        // being mistaken for a promise.
        return value;
      }

      const method = value as (...args: unknown[]) => unknown;
      const shouldCheck = !IGNORED_METHODS.has(property);

      return (...args: unknown[]): unknown => {
        // The key as it was when the request went out. Null means the request was
        // anonymous, so a failure tells us nothing about a session — this is what
        // stops an already signed-out user from being "signed out" again.
        const sessionKeyAtRequest = getSessionKey();

        // Apply with `this` = the wrapped client rather than this Proxy, so the
        // call is exactly what it was before the wrapper existed.
        const result = method.apply(target, args);

        if (!shouldCheck || !sessionKeyAtRequest || !isThenable(result)) {
          return result;
        }

        // `.then` only, never `.catch`: a rejection (offline, DNS, CORS, a 500
        // with no body) must pass through unobserved and must never sign anyone
        // out.
        return result.then((resolved) => {
          const errorCode = findFatalSessionErrorCode(resolved);
          if (errorCode && getSessionKey() === sessionKeyAtRequest) {
            // Still the same session. If the key has already changed — a sibling
            // request beat us to it, or the user signed out and back in — this
            // failure is stale news. That check is what collapses a burst of
            // simultaneous failures into a single sign-out.
            onSessionInvalidated(errorCode);
          }
          return resolved;
        });
      };
    },

    set(target, property, value) {
      // Keeps `client.sessionKey = "..."` working: OsManager's effect mirrors the
      // signal onto the client this way, and LoginManager assigns it directly.
      // Reflect.set's receiver defaults to `target`, so this cannot recurse.
      return Reflect.set(target, property, value);
    },
  });
}
