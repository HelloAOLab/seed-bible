import * as z from "zod/v4";

/**
 * What the signed-in account has done with its notifications, kept in a
 * `private` record item so every device agrees on what's been read and
 * dismissed. See docs/notifications.md §4.
 */
export interface NotificationState {
  /** Notification id → when it was first seen. */
  seen: Record<string, number>;
  /** Notification id → when it was dismissed. */
  dismissed: Record<string, number>;
  /**
   * The newest app version this account has run, the one it ran before that
   * (null when there was no earlier one to compare with), and when it first
   * ran the newest.
   */
  appVersion: AppVersionSeen | null;
}

export interface AppVersionSeen {
  version: string;
  previousVersion: string | null;
  sinceMs: number;
}

/** The record item address the account copy lives at. */
export const NOTIFICATION_STATE_ADDRESS = "notifications";

/**
 * Seen and dismissed entries older than this are dropped on every write.
 * Nothing still listed is that old: friend requests expire after 7 days and
 * update notices after 30.
 */
export const NOTIFICATION_STATE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const timestampMap = z.record(z.string(), z.number());

export const NOTIFICATION_STATE_SCHEMA: z.ZodType<NotificationState> = z.object(
  {
    seen: timestampMap.catch({}),
    dismissed: timestampMap.catch({}),
    appVersion: z
      .object({
        version: z.string(),
        previousVersion: z.string().nullable(),
        sinceMs: z.number(),
      })
      .nullable()
      .catch(null),
  }
);

export const emptyNotificationState = (): NotificationState => ({
  seen: {},
  dismissed: {},
  appVersion: null,
});

/**
 * Compares dotted version numbers (`1.17.0`, `1.18.2`) part by part; anything
 * after a `-` (a pre-release tag) is ignored. Negative when `a` is older.
 */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .split("-")[0]!
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/** Keeps the earliest time for every id either map has. */
function mergeTimestamps(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const merged = { ...a };
  for (const [id, atMs] of Object.entries(b)) {
    const existing = merged[id];
    merged[id] = existing === undefined ? atMs : Math.min(existing, atMs);
  }
  return merged;
}

function mergeAppVersions(
  a: AppVersionSeen | null,
  b: AppVersionSeen | null
): AppVersionSeen | null {
  if (!a || !b) {
    return a ?? b;
  }
  const order = compareVersions(a.version, b.version);
  if (order !== 0) {
    return order > 0 ? a : b;
  }
  // The same version noticed on two devices: the earlier notice is the real
  // one, and whichever device knew what came before it says what that was.
  const [first, second] = a.sinceMs <= b.sinceMs ? [a, b] : [b, a];
  return {
    version: first.version,
    previousVersion: first.previousVersion ?? second.previousVersion,
    sinceMs: first.sinceMs,
  };
}

/**
 * Combines two copies so that nothing either one recorded is lost: an id seen
 * or dismissed on either device stays so, and the newer app version wins.
 * Order doesn't matter, so two devices writing at once can't undo each other.
 */
export function mergeNotificationStates(
  a: NotificationState,
  b: NotificationState
): NotificationState {
  return {
    seen: mergeTimestamps(a.seen, b.seen),
    dismissed: mergeTimestamps(a.dismissed, b.dismissed),
    appVersion: mergeAppVersions(a.appVersion, b.appVersion),
  };
}

/** Drops seen and dismissed entries older than the retention window. */
export function pruneNotificationState(
  state: NotificationState,
  nowMs: number
): NotificationState {
  const cutoff = nowMs - NOTIFICATION_STATE_RETENTION_MS;
  const keep = (map: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(map).filter(([, atMs]) => atMs >= cutoff)
    );
  return {
    seen: keep(state.seen),
    dismissed: keep(state.dismissed),
    appVersion: state.appVersion,
  };
}

/** Whether `next` records anything `previous` doesn't. */
export function notificationStateChanged(
  previous: NotificationState,
  next: NotificationState
): boolean {
  const sameMap = (a: Record<string, number>, b: Record<string, number>) => {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => a[key] === b[key])
    );
  };
  const pa = previous.appVersion;
  const na = next.appVersion;
  return !(
    sameMap(previous.seen, next.seen) &&
    sameMap(previous.dismissed, next.dismissed) &&
    (pa === na ||
      (!!pa &&
        !!na &&
        pa.version === na.version &&
        pa.previousVersion === na.previousVersion &&
        pa.sinceMs === na.sinceMs))
  );
}

/**
 * Records that the account is now running `currentVersion`. A newer version
 * than the stored one becomes the stored one, remembering what came before;
 * an account with nothing stored starts at `currentVersion` with no earlier
 * version, so a brand-new account gets no update notice. An older version
 * (an old cached page, a branch preview) leaves the state alone.
 */
export function noteAppVersion(
  state: NotificationState,
  currentVersion: string,
  nowMs: number
): NotificationState {
  const stored = state.appVersion;
  if (!stored) {
    return {
      ...state,
      appVersion: {
        version: currentVersion,
        previousVersion: null,
        sinceMs: nowMs,
      },
    };
  }
  if (compareVersions(currentVersion, stored.version) <= 0) {
    return state;
  }
  return {
    ...state,
    appVersion: {
      version: currentVersion,
      previousVersion: stored.version,
      sinceMs: nowMs,
    },
  };
}
