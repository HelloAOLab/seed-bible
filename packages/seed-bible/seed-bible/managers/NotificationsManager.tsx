import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import { safeLocalStorage } from "../app/ssrEnv";
import type { FriendRequest, FriendsManager } from "./FriendsManager";
import type { LoginManager } from "./LoginManager";
import {
  emptyNotificationState,
  mergeNotificationStates,
  noteAppVersion,
  notificationStateChanged,
  NOTIFICATION_STATE_ADDRESS,
  NOTIFICATION_STATE_RETENTION_MS,
  NOTIFICATION_STATE_SCHEMA,
  pruneNotificationState,
  type NotificationState,
} from "./NotificationState";
import type { CasualOSManager } from "./OsManager";
import { readRecord } from "./RecordRead";
import { displayNameOf } from "./Utils";

/*
 * The design, and how to add a new kind of notification, is in
 * docs/notifications.md.
 */

interface NotificationBase {
  /**
   * Stays the same for as long as the thing it's about exists; seen and
   * dismissed state is kept against it.
   */
  id: string;
  /** When the thing happened; the list is sorted newest first by this. */
  createdAtMs: number;
}

/** Someone asked to be the signed-in user's friend. */
export interface FriendRequestNotification extends NotificationBase {
  kind: "friendRequest";
  request: FriendRequest;
}

/** The account is running a newer Seed Bible than it last ran. */
export interface AppUpdateNotification extends NotificationBase {
  kind: "appUpdate";
  version: string;
  previousVersion: string;
  releaseNotesUrl: string;
}

export type AppNotification = FriendRequestNotification | AppUpdateNotification;

export type NotificationKind = AppNotification["kind"];

export interface NotificationItem {
  notification: AppNotification;
  /**
   * Not seen before the list was last opened. Stays true while the list is
   * open, so what was new when it opened is still marked as new.
   */
  isUnread: boolean;
}

/** One kind's notifications, as they stand right now. */
export interface NotificationSource {
  notifications: ReadonlySignal<AppNotification[]>;
  /** False until the first load for the current account has finished. */
  isReady: ReadonlySignal<boolean>;
}

export interface NotificationsManager {
  /** Everything not dismissed, newest first. */
  items: ReadonlySignal<NotificationItem[]>;
  /** How many of {@link items} are unread; what the bell's badge shows. */
  unreadCount: ReadonlySignal<number>;
  /**
   * True once every source has loaded and the account's read/dismissed state
   * has loaded (or failed to), so counts won't jump on their own any more.
   */
  isReady: ReadonlySignal<boolean>;

  /** Whether the notifications list is open. */
  isFeedOpen: ReadonlySignal<boolean>;
  /** Opens the list. Everything in it counts as seen from then on. */
  openFeed: () => void;
  closeFeed: () => void;

  /**
   * Removes a notification from the list, on every device. Only the
   * notification: a dismissed friend request still waits in Friends.
   */
  dismiss: (id: string) => void;
  /** Dismisses everything currently listed. */
  dismissAll: () => void;

  /**
   * Re-reads every source and the account's read/dismissed state, e.g. when a
   * push arrives while the app is open.
   */
  refresh: () => Promise<void>;

  /**
   * Reads this device's saved copy. Must run after the first render (it reads
   * `localStorage`); until it does, the list and badge stay empty, as they
   * were on the server.
   */
  hydrateStoredState: () => void;

  dispose: () => void;
}

export type NotificationToast = (
  message: string,
  options?: { onClick?: () => void; hint?: string; key?: string }
) => void;

export interface CreateNotificationsManagerOptions {
  os: CasualOSManager;
  login: LoginManager;
  friends: FriendsManager;
  toast: NotificationToast;
  i18n: { t: (key: string, options?: Record<string, unknown>) => string };
  /** The version this build is; defaults to the one baked in at build time. */
  appVersion?: string;
  now?: () => number;
  /**
   * How long after a change to wait before saving it to the account, so
   * opening the list and dismissing a couple of things is one write.
   */
  saveDelayMs?: number;
}

/** Marks the toast that announces new notifications. */
export const NEW_NOTIFICATIONS_TOAST_KEY = "notifications-new";

/** An update notice stays listed this long after the update. */
export const APP_UPDATE_NOTICE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/** Where an update notice's "See what's new" goes. */
export const releaseNotesUrl = (version: string) =>
  `https://github.com/HelloAOLab/seed-bible/releases/tag/v${version}`;

/**
 * Coming back to the app re-reads the account's read/dismissed state at most
 * this often, matching how often the friends lists are re-read.
 */
const FOCUS_REFRESH_INTERVAL_MS = 30 * 1000;

const SIGNED_OUT_KEY = "signed-out";
const stateStorageKey = (accountKey: string) =>
  `sb-notifications:${accountKey}`;
const announcedStorageKey = (accountKey: string) =>
  `sb-notifications-announced:${accountKey}`;

/** Where the account copy stands for the account currently shown. */
type AccountStatus =
  /** Not hydrated yet, or waiting on the account copy. */
  | "loading"
  /** The account copy was read (or there was none). */
  | "loaded"
  /** The account copy couldn't be read; this device's copy is all there is. */
  | "error"
  /** Signed out: this device's copy is the only copy. */
  | "local";

function parseJson(raw: string | null): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readLocalJson(key: string): unknown {
  try {
    return parseJson(safeLocalStorage.getItem(key));
  } catch {
    return null;
  }
}

const parseState = (value: unknown): NotificationState | null => {
  const parsed = NOTIFICATION_STATE_SCHEMA.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/** Notification id → when it was announced, from a saved copy. */
const parseAnnounced = (value: unknown): Record<string, number> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value).filter(([, ms]) => typeof ms === "number")
      )
    : {};

function writeLocalJson(key: string, value: unknown): void {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage full or blocked: the account copy (when signed in) still has it.
    console.warn(`Could not save ${key}:`, error);
  }
}

/** The whole notification as one sentence, as a toast or a label says it. */
export function describeNotification(
  notification: AppNotification,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  switch (notification.kind) {
    case "friendRequest":
      return t("notification-friend-request", {
        name: displayNameOf(notification.request, t),
        defaultValue: "{{name}} sent you a friend request",
      });
    case "appUpdate":
      return t("notification-app-updated", {
        version: notification.version,
        defaultValue: "Seed Bible was updated to version {{version}}",
      });
  }
}

export function createNotificationsManager(
  options: CreateNotificationsManagerOptions
): NotificationsManager {
  const { os, login, friends, toast, i18n } = options;
  const appVersion = options.appVersion ?? __APP_VERSION__;
  const now = options.now ?? Date.now;
  const saveDelayMs = options.saveDelayMs ?? 1500;

  const hydrated = signal(false);
  /** Whose state is loaded: a user id, or {@link SIGNED_OUT_KEY}. */
  const accountKey = signal<string | null>(null);
  const status = signal<AccountStatus>("loading");
  const state = signal<NotificationState>(emptyNotificationState());
  /** Notification id → when this device announced it with a toast. */
  const announced = signal<Record<string, number>>({});

  const feedOpen = signal(false);
  /** Unread when the list was opened, or arriving while it was open. */
  const newWhileOpen = signal<ReadonlySet<string>>(new Set());

  // Bumped whenever the account changes, so an answer from the server that
  // lands after a switch is dropped instead of mixing two accounts' state.
  let accountVersion = 0;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastAccountReadMs = 0;

  // ─── Sources ───────────────────────────────────────────────────────────────

  const friendRequests: NotificationSource = {
    notifications: computed(() =>
      friends.incomingRequests.value.map(
        (request): FriendRequestNotification => ({
          id: `friend-request:${request.id}`,
          kind: "friendRequest",
          createdAtMs: request.createdAtMs,
          request,
        })
      )
    ),
    // Waits for names too, so a toast says who sent the request rather than
    // a placeholder.
    isReady: computed(
      () =>
        !login.userId.value ||
        (friends.isLoaded.value && !friends.isLoadingProfiles.value)
    ),
  };

  const appUpdates: NotificationSource = {
    notifications: computed(() => {
      const seen = state.value.appVersion;
      if (
        !seen ||
        seen.version !== appVersion ||
        !seen.previousVersion ||
        now() - seen.sinceMs > APP_UPDATE_NOTICE_LIFETIME_MS
      ) {
        return [];
      }
      return [
        {
          id: `app-update:${seen.version}`,
          kind: "appUpdate",
          createdAtMs: seen.sinceMs,
          version: seen.version,
          previousVersion: seen.previousVersion,
          releaseNotesUrl: releaseNotesUrl(seen.version),
        } satisfies AppUpdateNotification,
      ];
    }),
    isReady: computed(() => hydrated.value && status.value !== "loading"),
  };

  const sources: NotificationSource[] = [friendRequests, appUpdates];

  // ─── The list ──────────────────────────────────────────────────────────────

  const visible = computed<AppNotification[]>(() => {
    if (!hydrated.value) {
      return [];
    }
    const dismissed = state.value.dismissed;
    return sources
      .flatMap((source) => source.notifications.value)
      .filter((n) => !(n.id in dismissed))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  });

  const items = computed<NotificationItem[]>(() => {
    const seen = state.value.seen;
    const fresh = newWhileOpen.value;
    return visible.value.map((notification) => ({
      notification,
      isUnread: !(notification.id in seen) || fresh.has(notification.id),
    }));
  });

  const unreadCount = computed(
    () => items.value.filter((item) => item.isUnread).length
  );

  const isReady = computed(
    () =>
      hydrated.value &&
      status.value !== "loading" &&
      sources.every((source) => source.isReady.value)
  );

  // ─── Saving ────────────────────────────────────────────────────────────────

  /**
   * Saves this device's copy merged with what's saved there already, and
   * returns what was saved. Every tab keeps its own copy in memory, so one
   * that hasn't heard about another tab's dismissal yet would otherwise undo
   * it, for good when the account copy can't be reached.
   */
  const saveLocalState = (
    key: string,
    next: NotificationState
  ): NotificationState => {
    const stored = parseState(readLocalJson(stateStorageKey(key)));
    const merged = pruneNotificationState(
      stored ? mergeNotificationStates(stored, next) : next,
      now()
    );
    writeLocalJson(stateStorageKey(key), merged);
    return merged;
  };

  /**
   * Reads the account copy, merges it with ours, and writes the result back
   * if ours added anything. Never writes without a successful read first:
   * writing blind would replace another device's reads and dismissals.
   */
  const syncWithAccount = async (): Promise<void> => {
    const userId = accountKey.peek();
    if (!userId || userId === SIGNED_OUT_KEY) {
      return;
    }
    const version = accountVersion;
    lastAccountReadMs = now();
    const read = readRecord(
      await os
        .getData(userId, NOTIFICATION_STATE_ADDRESS)
        .catch(() => undefined),
      NOTIFICATION_STATE_SCHEMA,
      "notification state"
    );
    if (version !== accountVersion) {
      return;
    }
    if (read.status === "error") {
      if (status.peek() === "loading") {
        status.value = "error";
      }
      return;
    }
    const remote =
      read.status === "found" ? read.value : emptyNotificationState();
    // The update check happens here, after the account copy is in: a new
    // device signing in to an existing account compares against what the
    // account last ran, not against nothing.
    const merged = pruneNotificationState(
      noteAppVersion(
        mergeNotificationStates(remote, state.peek()),
        appVersion,
        now()
      ),
      now()
    );
    const saved = saveLocalState(userId, merged);
    batch(() => {
      state.value = saved;
      status.value = "loaded";
    });
    if (read.status === "absent" || notificationStateChanged(remote, saved)) {
      const result = await os
        .recordData(userId, NOTIFICATION_STATE_ADDRESS, saved, {
          marker: "private",
        })
        .catch((error: unknown) => ({ success: false as const, error }));
      if (result && result.success === false) {
        // The device copy has it, and the next change or refresh tries again.
        console.warn("Could not save notification state:", result);
      }
    }
  };

  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void syncWithAccount();
    }, saveDelayMs);
  };

  /** Applies a change locally right away and saves it shortly after. */
  const update = (
    change: (current: NotificationState) => NotificationState
  ) => {
    const key = accountKey.peek();
    if (!key) {
      return;
    }
    const next = change(state.peek());
    if (!notificationStateChanged(state.peek(), next)) {
      return;
    }
    state.value = saveLocalState(key, next);
    if (key !== SIGNED_OUT_KEY) {
      scheduleSave();
    }
  };

  // ─── Following the account ─────────────────────────────────────────────────

  const loadAccount = (key: string) => {
    accountVersion++;
    if (saveTimer) {
      // A change waiting to be saved belongs to the previous account. Its
      // device copy is already written, so it's saved on that account's next
      // visit rather than into this one.
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    let local =
      parseState(readLocalJson(stateStorageKey(key))) ??
      emptyNotificationState();
    if (key === SIGNED_OUT_KEY) {
      // Signed out, this device's copy is the only one, so it's checked now;
      // signed in, the check waits for the account copy (`syncWithAccount`).
      const noted = noteAppVersion(local, appVersion, now());
      if (notificationStateChanged(local, noted)) {
        writeLocalJson(stateStorageKey(key), noted);
      }
      local = noted;
    }
    batch(() => {
      accountKey.value = key;
      state.value = local;
      announced.value = parseAnnounced(readLocalJson(announcedStorageKey(key)));
      newWhileOpen.value = new Set();
      status.value = key === SIGNED_OUT_KEY ? "local" : "loading";
    });
    if (key !== SIGNED_OUT_KEY) {
      void syncWithAccount();
    }
  };

  const stopFollowingAccount = effect(() => {
    if (!hydrated.value) {
      return;
    }
    const key = login.userId.value ?? SIGNED_OUT_KEY;
    if (key !== accountKey.peek()) {
      loadAccount(key);
    }
  });

  // ─── The open list ─────────────────────────────────────────────────────────

  // Everything shown while the list is open counts as seen, including what
  // arrives while it's open.
  const stopMarkingSeen = effect(() => {
    if (!feedOpen.value) {
      return;
    }
    const seen = state.peek().seen;
    const unseen = visible.value.filter((n) => !(n.id in seen));
    if (unseen.length === 0) {
      return;
    }
    const atMs = now();
    batch(() => {
      newWhileOpen.value = new Set([
        ...newWhileOpen.peek(),
        ...unseen.map((n) => n.id),
      ]);
      update((s) => ({
        ...s,
        seen: {
          ...s.seen,
          ...Object.fromEntries(unseen.map((n) => [n.id, atMs])),
        },
      }));
    });
  });

  const openFeed = () => {
    feedOpen.value = true;
  };
  const closeFeed = () => {
    batch(() => {
      feedOpen.value = false;
      newWhileOpen.value = new Set();
    });
  };

  const dismissIds = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    const atMs = now();
    update((s) => ({
      ...s,
      dismissed: {
        ...s.dismissed,
        ...Object.fromEntries(ids.map((id) => [id, atMs])),
      },
    }));
  };

  // ─── Toasts ────────────────────────────────────────────────────────────────

  // Each device announces a notification once: on the phone when it arrives,
  // and on the laptop the next time it's opened. Waits for everything to load,
  // so it doesn't announce what another device already marked as seen, or
  // "1 new" followed a moment later by "2 new".
  const stopAnnouncing = effect(() => {
    if (!isReady.value || typeof window === "undefined") {
      return;
    }
    const key = accountKey.value;
    if (!key) {
      return;
    }
    // Read again here rather than trusting the copy loaded with the account:
    // another tab on this device may have announced the same notification
    // since, and this way it isn't toasted twice. Two tabs deciding at the
    // very same moment can still both toast.
    const done = {
      ...parseAnnounced(readLocalJson(announcedStorageKey(key))),
      ...announced.value,
    };
    const fresh = items.value.filter(
      (item) => item.isUnread && !(item.notification.id in done)
    );
    if (fresh.length === 0) {
      return;
    }
    const atMs = now();
    const cutoff = atMs - NOTIFICATION_STATE_RETENTION_MS;
    const next = Object.fromEntries(
      Object.entries(done).filter(([, ms]) => ms >= cutoff)
    );
    for (const item of fresh) {
      next[item.notification.id] = atMs;
    }
    announced.value = next;
    writeLocalJson(announcedStorageKey(key), next);

    if (feedOpen.peek()) {
      // Already looking at them.
      return;
    }
    const { t } = i18n;
    toast(
      fresh.length === 1
        ? describeNotification(fresh[0]!.notification, t)
        : t("notifications-new", {
            count: fresh.length,
            defaultValue_one: "You have {{count}} new notification",
            defaultValue_other: "You have {{count}} new notifications",
          }),
      {
        key: NEW_NOTIFICATIONS_TOAST_KEY,
        hint: t("notifications-toast-hint", {
          defaultValue: "Tap to see your notifications",
        }),
        onClick: openFeed,
      }
    );
  });

  // ─── The app icon's badge ──────────────────────────────────────────────────

  // An installed app can show the unread count on its icon. Waits for
  // everything to load so the badge doesn't flicker on start-up.
  const stopBadging = effect(() => {
    if (!isReady.value || typeof navigator === "undefined") {
      return;
    }
    const count = unreadCount.value;
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      const pending =
        count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
      pending?.catch(() => {});
    } catch {
      // Not allowed here (not installed, or the browser refuses): no badge.
    }
  });

  // ─── Refreshing ────────────────────────────────────────────────────────────

  const refresh = async () => {
    await Promise.all([friends.refresh(), syncWithAccount()]);
  };

  // Friends re-reads its own lists when the app comes back; this re-reads what
  // other devices have marked as seen or dismissed meanwhile.
  const refreshOnReturn = () => {
    if (
      document.visibilityState === "visible" &&
      now() - lastAccountReadMs >= FOCUS_REFRESH_INTERVAL_MS
    ) {
      void syncWithAccount();
    }
  };

  // Another tab on this device saved its copy: what it marked as seen or
  // dismissed counts here too. (What it announced is read when this tab is
  // about to announce something; see `stopAnnouncing`.)
  const followOtherTabs = (event: StorageEvent) => {
    const key = accountKey.peek();
    if (!key || event.key !== stateStorageKey(key)) {
      return;
    }
    const theirs = parseState(parseJson(event.newValue));
    const merged = theirs && mergeNotificationStates(state.peek(), theirs);
    if (merged && notificationStateChanged(state.peek(), merged)) {
      state.value = merged;
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("storage", followOtherTabs);
  }

  const dispose = () => {
    stopFollowingAccount();
    stopMarkingSeen();
    stopAnnouncing();
    stopBadging();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("storage", followOtherTabs);
    }
  };

  return {
    items,
    unreadCount,
    isReady,
    isFeedOpen: computed(() => feedOpen.value),
    openFeed,
    closeFeed,
    dismiss: (id) => dismissIds([id]),
    dismissAll: () => dismissIds(visible.peek().map((n) => n.id)),
    refresh,
    hydrateStoredState: () => {
      hydrated.value = true;
    },
    dispose,
  };
}
