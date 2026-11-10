/**
 * Push notification relay: sends a friend request's push to the recipient's
 * devices once it has checked, as the sender, that the request is real.
 *
 * Why it exists and how a push travels is in docs/notifications.md §7.2. In
 * short: CasualOS stores push subscriptions and sends web pushes, but nothing
 * there lets a stranger send to someone. Each person who turns push on lets
 * one account, the notifier, send to their `inbox` notification; this relay
 * holds the notifier's session and only sends what it wrote itself.
 *
 * Kept free of app code (the server bundle must not pull in the client), and
 * written against injected `fetch`/`now` so it can be tested without a
 * network.
 */
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const NOTIFICATIONS_CONFIG_PATH = "/api/notifications/config";
export const FRIEND_REQUEST_PUSH_PATH = "/api/notifications/friend-request";

/** The notification in each person's record that the notifier may send to. */
export const INBOX_ADDRESS = "inbox";

/** Only a request made this recently gets a push. */
export const FRIEND_REQUEST_PUSH_WINDOW_MS = 15 * 60 * 1000;

/** Request bodies are a request id; anything bigger is refused unread. */
export const MAX_BODY_BYTES = 4 * 1024;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** A sent request answered with a push is remembered at least this long. */
const SENT_REQUEST_TTL_MS = 2 * FRIEND_REQUEST_PUSH_WINDOW_MS;

/**
 * A key CasualOS accepted skips the rejected-keys budget for this long, so
 * people who use push keep getting through while forged keys flood in.
 */
const ACCEPTED_KEY_TTL_MS = HOUR_MS;

/** A key CasualOS turned down is refused without asking again for this long. */
const REJECTED_KEY_TTL_MS = 5 * MINUTE_MS;

/** The most entries (key hashes, request ids) any one memory holds. */
const MAX_REMEMBERED = 10_000;

/** How often a limiter drops keys it no longer needs. */
const SWEEP_INTERVAL_MS = MINUTE_MS;

/**
 * A request made in the last 15 minutes is on the first page of the sender's
 * sent list (newest first), so a lookup that pages further than this is
 * looking for something that won't qualify anyway.
 */
const MAX_SENT_PAGES = 5;

const MAX_REQUEST_ID_LENGTH = 200;
const MAX_NAME_LENGTH = 60;
const CASUALOS_TIMEOUT_MS = 10_000;

const PUSH_ICON = "https://favicon.ao.bot/pwa/pwa-192x192.png";
const FALLBACK_SENDER_NAME = "Someone";

export interface NotificationsRelayConfig {
  /** Session key of the account that sends pushes; null turns the relay off. */
  notifierSessionKey: string | null;
  /** The CasualOS records server, without a trailing slash. */
  casualosEndpoint: string;
  /** Where a tapped push goes, and the `Origin` CasualOS checks on API calls. */
  siteOrigin: string;
}

export interface RelayLimits {
  /** Lookups one sender's key may get through in an hour, found or not. */
  senderPerHour: number;
  /** Pushes one person may be sent in an hour, by anyone. */
  recipientPerHour: number;
  /** Pushes from one sender to one recipient in a day. */
  pairPerDay: number;
  /** Lookups of senders' requests that may wait on CasualOS at once. */
  lookupsAtOnce: number;
  /**
   * Keys CasualOS may turn down in a minute. Past that, a key it hasn't
   * accepted in the last hour is refused without asking it.
   */
  rejectedKeysPerMinute: number;
}

export const DEFAULT_RELAY_LIMITS: Readonly<RelayLimits> = {
  senderPerHour: 10,
  recipientPerHour: 5,
  pairPerDay: 1,
  lookupsAtOnce: 8,
  rejectedKeysPerMinute: 30,
};

export interface NotificationsRelayOptions {
  config: NotificationsRelayConfig;
  fetch?: typeof fetch;
  now?: () => number;
  limits?: Partial<RelayLimits>;
  log?: Pick<Console, "info" | "warn" | "error">;
}

export interface RelayRequest {
  method: string;
  pathname: string;
  /** The `Authorization` header as sent. */
  authorization: string | undefined;
  /** The raw body, or null when there was none. */
  body: string | null;
}

export interface RelayResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface NotificationsRelay {
  /** Whether pushes can be sent right now (a notifier is set and unexpired). */
  isEnabled: () => boolean;
  /** Whether `pathname` is one of the relay's routes. */
  handles: (pathname: string) => boolean;
  handle: (request: RelayRequest) => Promise<RelayResponse>;
  /**
   * Resolves once every push accepted so far has been sent or has failed.
   * A push is sent after its request is answered, so the answer can't hint
   * at whether the recipient has push on.
   */
  idle: () => Promise<void>;
}

export interface ParsedSessionKey {
  userId: string;
  /** Null for a key that never expires. */
  expireTimeMs: number | null;
}

/**
 * Reads the user id and expiry out of a CasualOS session key
 * (`vSK1.<userId>.<sessionId>.<secret>.<expireTime>`, each part base64).
 * Mirrors `parseSessionKey` in `@casual-simulation/aux-common`, which isn't
 * imported so the server bundle stays small. Says nothing about whether the
 * key is still valid; only CasualOS knows that.
 */
export function parseSessionKey(key: string): ParsedSessionKey | null {
  const parts = key.split(".");
  if (parts.length !== 5 || parts[0] !== "vSK1" || parts.some((p) => !p)) {
    return null;
  }
  const decode = (part: string) => Buffer.from(part, "base64").toString("utf8");
  const userId = decode(parts[1]!);
  const expireText = decode(parts[4]!);
  const expireTimeMs =
    expireText === "Infinity" ? null : Number.parseInt(expireText, 10);
  if (!userId || Number.isNaN(expireTimeMs)) {
    return null;
  }
  return { userId, expireTimeMs };
}

/**
 * The relay's settings from the environment (documented in server/README.md).
 * A value that can't be used turns the relay off with an error in the log,
 * rather than stopping the server: the site works without push.
 */
export function readNotificationsConfig(
  env: Record<string, string | undefined> = process.env,
  log: Pick<Console, "error"> = console
): NotificationsRelayConfig {
  let notifierSessionKey = env.NOTIFIER_SESSION_KEY?.trim() || null;
  const casualosEndpoint = (
    env.CASUALOS_AUTH_ENDPOINT?.trim() || "https://auth.seedbible.org"
  ).replace(/\/+$/, "");
  let siteOrigin = "https://seedbible.org";
  try {
    siteOrigin = new URL(env.NOTIFICATIONS_SITE_ORIGIN?.trim() || siteOrigin)
      .origin;
  } catch {
    log.error(
      "[notifications] NOTIFICATIONS_SITE_ORIGIN is not a URL; the push relay is off."
    );
    notifierSessionKey = null;
  }
  if (notifierSessionKey && !parseSessionKey(notifierSessionKey)) {
    log.error(
      "[notifications] NOTIFIER_SESSION_KEY is not a CasualOS session key; the push relay is off."
    );
    notifierSessionKey = null;
  }
  return { notifierSessionKey, casualosEndpoint, siteOrigin };
}

type CasualOSResult =
  | ({ success: true } & Record<string, unknown>)
  | { success: false; errorCode: string };

interface SentRequest {
  id: string;
  requestingUserId: string;
  targetUserId: string | null;
  permissions: unknown;
  status: string;
  createdAtMs: number;
  expireTimeMs: number | null;
}

/** CasualOS's answers that mean the key it was given is no good. */
const SESSION_ERROR_CODES = new Set([
  "invalid_key",
  "session_expired",
  "unacceptable_session_key",
  "not_logged_in",
  "no_session_key",
  "user_is_banned",
]);

/**
 * `sendNotification` answers that mean the recipient never set up push for
 * the notifier: no record or `inbox` yet, or no permission for the notifier.
 */
const NOT_SUBSCRIBED_CODES = new Set([
  "data_not_found",
  "record_not_found",
  "not_authorized",
]);

/**
 * The one permission a friend request asks for. Mirrors `FRIENDS_PERMISSION`
 * and `isFriendsPermissionSet` in `managers/FriendsManager.tsx`, which the
 * server can't import.
 */
function isFriendsPermissionSet(permissions: unknown): boolean {
  if (!Array.isArray(permissions) || permissions.length !== 1) {
    return false;
  }
  const [permission] = permissions as Record<string, unknown>[];
  return (
    permission?.marker === "friends" &&
    permission.resourceKind === "data" &&
    permission.action === "read"
  );
}

function isSentRequest(value: unknown): value is SentRequest {
  const v = value as Partial<SentRequest> | null;
  return (
    !!v &&
    typeof v.id === "string" &&
    typeof v.requestingUserId === "string" &&
    typeof v.status === "string" &&
    typeof v.createdAtMs === "number"
  );
}

/** Why a sent request doesn't get a push, or null when it does. */
function ineligibility(
  request: SentRequest,
  senderId: string,
  nowMs: number
): string | null {
  if (
    request.status !== "requested" ||
    (request.expireTimeMs !== null &&
      typeof request.expireTimeMs === "number" &&
      request.expireTimeMs <= nowMs)
  ) {
    return "request_not_pending";
  }
  if (!isFriendsPermissionSet(request.permissions)) {
    return "not_a_friend_request";
  }
  if (
    request.requestingUserId !== senderId ||
    !request.targetUserId ||
    request.targetUserId === senderId
  ) {
    return "no_recipient";
  }
  if (nowMs - request.createdAtMs > FRIEND_REQUEST_PUSH_WINDOW_MS) {
    return "request_too_old";
  }
  return null;
}

/** What a lock screen shows for a name: one line, no control characters. */
function cleanName(name: unknown): string | null {
  if (typeof name !== "string") {
    return null;
  }
  // eslint-disable-next-line no-control-regex
  const oneLine = name.replace(/[\u0000-\u001f\u007f]+/g, " ");
  const cleaned = oneLine.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }
  return cleaned.length > MAX_NAME_LENGTH
    ? `${cleaned.slice(0, MAX_NAME_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

export interface WindowLimiter {
  /** How long until `key` may go again, or 0 when it may go now. */
  waitMs: (key: string) => number;
  /** Counts one event for `key` now; calling the result takes it back. */
  record: (key: string) => () => void;
  /** How many keys it's holding events for. */
  readonly size: number;
}

/**
 * Counts events per key over a sliding window. Once a minute at most, it
 * drops every key whose events have all aged out, so it holds only the keys
 * seen lately rather than everyone it has ever seen.
 */
export function createWindowLimiter(options: {
  limit: number;
  windowMs: number;
  now: () => number;
}): WindowLimiter {
  const { limit, windowMs, now } = options;
  const events = new Map<string, number[]>();
  let sweptAtMs = -Infinity;

  const sweep = () => {
    const nowMs = now();
    if (nowMs - sweptAtMs < SWEEP_INTERVAL_MS) {
      return;
    }
    sweptAtMs = nowMs;
    for (const [key, times] of events) {
      if (times[times.length - 1]! <= nowMs - windowMs) {
        events.delete(key);
      }
    }
  };

  const recent = (key: string) => {
    sweep();
    const cutoff = now() - windowMs;
    const kept = (events.get(key) ?? []).filter((ms) => ms > cutoff);
    if (kept.length > 0) {
      events.set(key, kept);
    } else {
      events.delete(key);
    }
    return kept;
  };

  return {
    waitMs: (key) => {
      const kept = recent(key);
      return kept.length < limit
        ? 0
        : kept[kept.length - limit]! + windowMs - now();
    },
    record: (key) => {
      const at = now();
      events.set(key, [...recent(key), at]);
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        const times = events.get(key);
        const index = times?.lastIndexOf(at) ?? -1;
        if (!times || index < 0) {
          return;
        }
        times.splice(index, 1);
        if (times.length === 0) {
          events.delete(key);
        }
      };
    },
    get size() {
      return events.size;
    },
  };
}

/**
 * Remembers keys for `ttlMs`, holding at most `maxSize` (the oldest go
 * first when it's full).
 */
function createExpiringSet(options: {
  ttlMs: number;
  maxSize: number;
  now: () => number;
}) {
  const { ttlMs, maxSize, now } = options;
  // Every key lives `ttlMs` from when it was last added, and re-adding moves
  // it to the end, so the Map's order is expiry order.
  const expiresAt = new Map<string, number>();
  const prune = () => {
    const nowMs = now();
    for (const [key, untilMs] of expiresAt) {
      if (untilMs > nowMs) {
        break;
      }
      expiresAt.delete(key);
    }
  };
  return {
    has: (key: string) => {
      prune();
      return expiresAt.has(key);
    },
    add: (key: string) => {
      prune();
      expiresAt.delete(key);
      expiresAt.set(key, now() + ttlMs);
      for (const oldest of expiresAt.keys()) {
        if (expiresAt.size <= maxSize) {
          break;
        }
        expiresAt.delete(oldest);
      }
    },
    delete: (key: string) => {
      expiresAt.delete(key);
    },
  };
}

/** What's remembered about a key: a hash, so no key is held in memory. */
const keyHash = (key: string) =>
  createHash("sha256").update(key).digest("base64url");

const json = (
  status: number,
  body: unknown,
  headers?: Record<string, string>
): RelayResponse => ({ status, body, headers });

const refusal = (
  status: number,
  error: string,
  headers?: Record<string, string>
) => json(status, { error }, headers);

const rateLimited = (waitMs: number) =>
  refusal(429, "rate_limited", {
    "retry-after": String(Math.max(1, Math.ceil(waitMs / 1000))),
  });

const busy = () => refusal(503, "busy", { "retry-after": "1" });

/** The one key of the rejected-keys budget, which is shared by everyone. */
const ALL_KEYS = "all";

export function createNotificationsRelay(
  options: NotificationsRelayOptions
): NotificationsRelay {
  const { config } = options;
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const log = options.log ?? console;
  const limits = { ...DEFAULT_RELAY_LIMITS, ...options.limits };

  const notifier = config.notifierSessionKey
    ? parseSessionKey(config.notifierSessionKey)
    : null;

  const senders = createWindowLimiter({
    limit: limits.senderPerHour,
    windowMs: HOUR_MS,
    now,
  });
  const recipients = createWindowLimiter({
    limit: limits.recipientPerHour,
    windowMs: HOUR_MS,
    now,
  });
  /** Keyed by sender and recipient together. */
  const pairs = createWindowLimiter({
    limit: limits.pairPerDay,
    windowMs: DAY_MS,
    now,
  });
  const rejections = createWindowLimiter({
    limit: limits.rejectedKeysPerMinute,
    windowMs: MINUTE_MS,
    now,
  });
  const acceptedKeys = createExpiringSet({
    ttlMs: ACCEPTED_KEY_TTL_MS,
    maxSize: MAX_REMEMBERED,
    now,
  });
  const rejectedKeys = createExpiringSet({
    ttlMs: REJECTED_KEY_TTL_MS,
    maxSize: MAX_REMEMBERED,
    now,
  });
  /** Request ids already pushed. */
  const pushed = createExpiringSet({
    ttlMs: SENT_REQUEST_TTL_MS,
    maxSize: MAX_REMEMBERED,
    now,
  });
  let lookupsInFlight = 0;
  let floodWarnedAtMs = -Infinity;
  const deliveries = new Set<Promise<void>>();

  const isEnabled = () =>
    !!notifier &&
    (notifier.expireTimeMs === null || notifier.expireTimeMs > now());

  if (notifier && !isEnabled()) {
    log.error(
      "[notifications] NOTIFIER_SESSION_KEY has expired; the push relay is off."
    );
  }

  /**
   * Calls a CasualOS procedure the way its records client does (one POST to
   * `/api/v3/callProcedure`), with the `Origin` header its API requires.
   */
  const callProcedure = async (
    procedure: string,
    input: unknown,
    sessionKey: string | null
  ): Promise<CasualOSResult> => {
    try {
      const response = await fetchImpl(
        `${config.casualosEndpoint}/api/v3/callProcedure`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            Accept: "application/json",
            Origin: config.siteOrigin,
            ...(sessionKey ? { Authorization: `Bearer ${sessionKey}` } : {}),
          },
          body: JSON.stringify({ procedure, input }),
          signal: AbortSignal.timeout(CASUALOS_TIMEOUT_MS),
        }
      );
      const result = (await response.json().catch(() => null)) as {
        success?: unknown;
        errorCode?: unknown;
      } | null;
      if (!result || typeof result.success !== "boolean") {
        return { success: false, errorCode: `http_${response.status}` };
      }
      if (!result.success) {
        return {
          success: false,
          errorCode:
            typeof result.errorCode === "string"
              ? result.errorCode
              : "unknown_error",
        };
      }
      return result as CasualOSResult;
    } catch (error) {
      log.warn(`[notifications] ${procedure} didn't reach CasualOS:`, error);
      return { success: false, errorCode: "network_error" };
    }
  };

  /** Pages the sender's sent requests for `requestId`, newest first. */
  const findSentRequest = async (
    senderKey: string,
    requestId: string
  ): Promise<
    | { found: SentRequest | null }
    | { failure: CasualOSResult & { success: false } }
  > => {
    let listed = 0;
    let previousPage: string | null = null;
    for (let page = 0; page < MAX_SENT_PAGES; page++) {
      const result = await callProcedure(
        "listSentSharedPermissions",
        { page },
        senderKey
      );
      if (!result.success) {
        return { failure: result };
      }
      const items = Array.isArray(result.sharedPermissions)
        ? (result.sharedPermissions as unknown[])
        : [];
      const found = items.find(
        (item): item is SentRequest =>
          isSentRequest(item) && item.id === requestId
      );
      if (found) {
        return { found };
      }
      // A server that ignores `page` sends the first page every time.
      const thisPage = JSON.stringify(items);
      listed += items.length;
      if (
        items.length === 0 ||
        thisPage === previousPage ||
        listed >= Number(result.totalCount ?? 0)
      ) {
        break;
      }
      previousPage = thisPage;
    }
    return { found: null };
  };

  const senderName = async (senderId: string): Promise<string> => {
    const result = await callProcedure(
      "getData",
      { recordName: senderId, address: "profile" },
      null
    );
    if (!result.success) {
      if (result.errorCode !== "data_not_found") {
        log.warn(
          `[notifications] Couldn't read ${senderId}'s profile: ${result.errorCode}`
        );
      }
      return FALLBACK_SENDER_NAME;
    }
    const data = result.data as { name?: unknown } | null | undefined;
    return cleanName(data?.name) ?? FALLBACK_SENDER_NAME;
  };

  /**
   * Sends the push. `giveBack` undoes what was recorded for it, for a send
   * that failed on the way, so a retry may still push it and an outage
   * doesn't use up the recipient's allowance.
   */
  const deliver = async (
    senderId: string,
    recipientId: string,
    requestId: string,
    giveBack: () => void
  ): Promise<void> => {
    const name = await senderName(senderId);
    const result = await callProcedure(
      "sendNotification",
      {
        recordName: recipientId,
        address: INBOX_ADDRESS,
        payload: {
          title: "New friend request",
          body: `${name} wants to be your friend on Seed Bible.`,
          icon: PUSH_ICON,
          // A browser silently replaces a shown notification that has the
          // same tag, so each request gets its own.
          tag: `friend-request:${requestId}`,
          timestamp: now(),
          action: {
            type: "open_url",
            url: `${config.siteOrigin}/?notifications=open`,
          },
        },
      },
      config.notifierSessionKey
    );
    if (result.success) {
      return;
    }
    if (NOT_SUBSCRIBED_CODES.has(result.errorCode)) {
      // A real attempt: it still counts against the limits, or giving it
      // back would show whether the recipient has push on.
      log.info(
        `[notifications] ${recipientId} hasn't turned push on (${result.errorCode}).`
      );
      return;
    }
    giveBack();
    log.error(
      SESSION_ERROR_CODES.has(result.errorCode)
        ? `[notifications] CasualOS refused the notifier's session (${result.errorCode}); check NOTIFIER_SESSION_KEY.`
        : `[notifications] Couldn't send a friend request push to ${recipientId}: ${result.errorCode}`
    );
  };

  const deliverInBackground = (
    senderId: string,
    recipientId: string,
    requestId: string,
    giveBack: () => void
  ) => {
    const delivery = deliver(senderId, recipientId, requestId, giveBack)
      .catch((error: unknown) => {
        giveBack();
        log.error(
          `[notifications] Sending a friend request push to ${recipientId} failed:`,
          error
        );
      })
      .finally(() => {
        deliveries.delete(delivery);
      });
    deliveries.add(delivery);
  };

  const sendFriendRequestPush = async (
    request: RelayRequest
  ): Promise<RelayResponse> => {
    if (!isEnabled() || !config.notifierSessionKey) {
      return refusal(503, "push_relay_off");
    }

    let requestId: unknown;
    try {
      requestId = (JSON.parse(request.body ?? "") as { requestId?: unknown })
        ?.requestId;
    } catch {
      requestId = undefined;
    }
    if (
      typeof requestId !== "string" ||
      !requestId ||
      requestId.length > MAX_REQUEST_ID_LENGTH
    ) {
      return refusal(400, "invalid_request");
    }

    const bearer = request.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!bearer) {
      return refusal(401, "not_signed_in");
    }
    const sender = parseSessionKey(bearer);
    if (
      !sender ||
      (sender.expireTimeMs !== null && sender.expireTimeMs <= now())
    ) {
      return refusal(401, "invalid_session");
    }

    const hash = keyHash(bearer);
    if (rejectedKeys.has(hash)) {
      return refusal(401, "invalid_session");
    }

    // Everything up to the lookup is checked before asking CasualOS, so a
    // request refused here costs nothing.
    const senderWait = senders.waitMs(sender.userId);
    if (senderWait > 0) {
      return rateLimited(senderWait);
    }
    const knownKey = acceptedKeys.has(hash);
    if (!knownKey) {
      const floodWait = rejections.waitMs(ALL_KEYS);
      if (floodWait > 0) {
        if (now() - floodWarnedAtMs >= MINUTE_MS) {
          floodWarnedAtMs = now();
          log.warn(
            "[notifications] CasualOS turned down many session keys in the last minute; refusing keys it hasn't accepted lately."
          );
        }
        return rateLimited(floodWait);
      }
    }
    if (lookupsInFlight >= limits.lookupsAtOnce) {
      return busy();
    }

    // Taken before the lookup, so requests made at the same time can't all
    // pass the checks above. The sender's slot is kept only if CasualOS
    // accepts the key, so a forged key naming someone holds their slot just
    // while it's checked; the budget's slot is kept only if CasualOS turns
    // the key down.
    const giveBackSender = senders.record(sender.userId);
    const giveBackRejection = knownKey ? null : rejections.record(ALL_KEYS);
    let lookup: Awaited<ReturnType<typeof findSentRequest>>;
    lookupsInFlight++;
    try {
      lookup = await findSentRequest(bearer, requestId);
    } finally {
      lookupsInFlight--;
    }
    if ("failure" in lookup) {
      giveBackSender();
      if (SESSION_ERROR_CODES.has(lookup.failure.errorCode)) {
        if (knownKey) {
          rejections.record(ALL_KEYS);
        }
        acceptedKeys.delete(hash);
        rejectedKeys.add(hash);
        return refusal(401, "invalid_session");
      }
      giveBackRejection?.();
      log.warn(
        `[notifications] Couldn't list ${sender.userId}'s sent requests: ${lookup.failure.errorCode}`
      );
      return refusal(502, "upstream_error");
    }
    giveBackRejection?.();
    acceptedKeys.add(hash);

    const sent = lookup.found;
    if (!sent) {
      return refusal(404, "request_not_found");
    }
    const reason = ineligibility(sent, sender.userId, now());
    if (reason) {
      return refusal(409, reason);
    }

    if (pushed.has(requestId)) {
      return refusal(409, "already_sent");
    }
    const recipientId = sent.targetUserId!;
    const pair = JSON.stringify([sender.userId, recipientId]);
    const wait = Math.max(pairs.waitMs(pair), recipients.waitMs(recipientId));
    if (wait > 0) {
      return rateLimited(wait);
    }
    // Recorded with no await since the checks above, so requests made at the
    // same time can't all pass them.
    pushed.add(requestId);
    const giveBackRecipient = recipients.record(recipientId);
    const giveBackPair = pairs.record(pair);

    // Answered before sending, and the same whatever happens next: how long
    // the send takes, or whether it fails, would show whether the recipient
    // has push on, which is theirs to know, not the sender's.
    deliverInBackground(sender.userId, recipientId, requestId, () => {
      pushed.delete(requestId);
      giveBackRecipient();
      giveBackPair();
    });
    return json(200, { accepted: true });
  };

  const handle = async (request: RelayRequest): Promise<RelayResponse> => {
    if (request.pathname === NOTIFICATIONS_CONFIG_PATH) {
      if (request.method !== "GET") {
        return refusal(405, "method_not_allowed", { allow: "GET" });
      }
      return json(200, {
        push: isEnabled()
          ? { notifierUserId: notifier!.userId, inboxAddress: INBOX_ADDRESS }
          : null,
      });
    }
    if (request.pathname === FRIEND_REQUEST_PUSH_PATH) {
      if (request.method !== "POST") {
        return refusal(405, "method_not_allowed", { allow: "POST" });
      }
      return sendFriendRequestPush(request);
    }
    return refusal(404, "not_found");
  };

  return {
    isEnabled,
    handles: (pathname) =>
      pathname === NOTIFICATIONS_CONFIG_PATH ||
      pathname === FRIEND_REQUEST_PUSH_PATH,
    handle,
    idle: async () => {
      while (deliveries.size > 0) {
        await Promise.all(deliveries);
      }
    },
  };
}

/** Reads a request body up to `limit` bytes; null when it's bigger. */
function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > limit) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.off("data", onData);
        req.off("end", onEnd);
        resolve(null);
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => resolve(Buffer.concat(chunks).toString("utf8"));
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", reject);
  });
}

/**
 * Answers a request for one of the relay's routes on a Node response, used by
 * both the production host and the dev server. Returns false, having done
 * nothing, for any other path.
 */
export async function serveNotificationsApi(
  relay: NotificationsRelay,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  if (!relay.handles(pathname)) {
    return false;
  }
  const method = req.method ?? "GET";
  const send = (response: RelayResponse, extra?: Record<string, string>) => {
    res.writeHead(response.status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...response.headers,
      ...extra,
    });
    res.end(JSON.stringify(response.body));
  };

  let body: string | null = null;
  if (method === "POST") {
    try {
      body = await readBody(req, MAX_BODY_BYTES);
    } catch {
      send(refusal(400, "invalid_request"));
      return true;
    }
    if (body === null) {
      // The rest of the body is never read; closing the connection is
      // cheaper than draining it.
      res.on("finish", () => req.destroy());
      send(refusal(413, "body_too_large"), { connection: "close" });
      return true;
    }
  }

  const authorization = req.headers.authorization;
  try {
    send(
      await relay.handle({
        method,
        pathname,
        authorization:
          typeof authorization === "string" ? authorization : undefined,
        body,
      })
    );
  } catch (error) {
    console.error(`[notifications] ${method} ${pathname} failed:`, error);
    send(refusal(500, "server_error"));
  }
  return true;
}
