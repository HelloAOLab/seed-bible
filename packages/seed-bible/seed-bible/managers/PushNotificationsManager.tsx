import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import * as z from "zod/v4";
import { safeLocalStorage } from "../app/ssrEnv";
import type { LoginManager } from "./LoginManager";
import { getPlatform, isStandalone } from "./OnboardingManager";
import type { CasualOSManager, PushSubscriptionInfo } from "./OsManager";
import { captureEvent } from "./Utils";

/*
 * Push notifications on this device: whether they can work here, turning them
 * on and off, and asking the server to push a friend request that was just
 * sent. How the pieces fit together is in docs/notifications.md §7.
 */

/**
 * Where push stands on this device, for the signed-in account.
 *
 * - `checking`: still finding out; nothing to show yet.
 * - `unsupported`: this browser can't receive pushes, or there's no service
 *   worker (`pnpm dev` and branch previews have none).
 * - `unconfigured`: the server has no push relay, or CasualOS can't send.
 * - `signed-out`: pushes go to an account, so there's nothing to turn on.
 * - `needs-install`: iPhone or iPad, in Safari rather than the Home Screen
 *   app, where push isn't available.
 * - `denied`: the person blocked notifications for this site.
 * - `off` / `on`: whether this browser receives the account's pushes.
 */
export type PushNotificationStatus =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "signed-out"
  | "needs-install"
  | "denied"
  | "off"
  | "on";

export type PushNotificationError =
  /** The permission prompt was closed without an answer. */
  | "dismissed"
  /** CasualOS isn't set up to send pushes. */
  | "unavailable"
  /** Something failed partway; trying again may work. */
  | "failed";

export interface PushNotificationsManager {
  status: ReadonlySignal<PushNotificationStatus>;
  /** True while turning push on or off. */
  isBusy: ReadonlySignal<boolean>;
  /** Why the last `enable()` or `disable()` didn't finish, if it didn't. */
  error: ReadonlySignal<PushNotificationError | null>;

  /**
   * Turns push on for this browser and the signed-in account. Call it
   * straight from a tap: browsers only show the permission prompt for one.
   * Ends `on` only if every step worked.
   */
  enable: () => Promise<void>;
  /** Stops this browser receiving pushes. The account's other devices keep them. */
  disable: () => Promise<void>;

  /**
   * Asks the server to push a friend request the signed-in user just sent to
   * its recipient. Never throws; a push that can't be sent is only logged.
   */
  notifyFriendRequestSent: (requestId: string) => Promise<void>;

  /**
   * Starts checking this device. Must run after the first render (it reads
   * `localStorage`); until then `status` is `checking`, as on the server.
   */
  hydrate: () => void;
  dispose: () => void;
}

export interface CreatePushNotificationsManagerOptions {
  os: CasualOSManager;
  login: LoginManager;
  /** Called when a push arrives while the app is open. */
  onPushReceived?: () => void;
  now?: () => number;
  /**
   * How long to wait for a service worker that hasn't registered yet (it
   * registers once the page has loaded) before deciding there is none.
   */
  serviceWorkerTimeoutMs?: number;
}

/** The relay's answer to `GET /api/notifications/config`. */
export interface PushRelayConfig {
  /** The account allowed to send to each person's inbox. */
  notifierUserId: string;
  /** The notification, in each person's own record, that pushes go to. */
  inboxAddress: string;
}

const CONFIG_URL = "/api/notifications/config";
const FRIEND_REQUEST_PUSH_URL = "/api/notifications/friend-request";

/** Matches `PUSH_RECEIVED_MESSAGE` in `standalone/swPush.ts`. */
const PUSH_RECEIVED_MESSAGE = "sb-push-received";

/**
 * Which account this browser's push subscription was set up for. CasualOS
 * links a browser to every account that subscribed on it, so this is what
 * tells a subscription that's the signed-in user's from one left behind by
 * someone else.
 */
export const PUSH_DEVICE_STORAGE_KEY = "sb-push-user";

const DEVICE_SCHEMA = z.object({
  userId: z.string(),
  endpoint: z.string(),
  notifierUserId: z.string(),
  /** When this browser last told CasualOS it belongs to `userId`. */
  registeredAtMs: z.number(),
});
type DeviceRecord = z.infer<typeof DEVICE_SCHEMA>;

const CONFIG_SCHEMA = z.object({
  push: z
    .object({
      notifierUserId: z.string().min(1),
      inboxAddress: z.string().min(1),
    })
    .nullable(),
});

/**
 * How often this browser re-registers itself with CasualOS, in case CasualOS
 * dropped it (it does when a push to it ever fails).
 */
const REREGISTER_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Keeps turning push on, off and checking it from overlapping, across tabs too. */
const PUSH_LOCK = "seed-bible:push-subscription";

/** CasualOS hands out its VAPID key as URL-safe base64; `subscribe` wants bytes. */
export function applicationServerKeyBytes(
  key: string
): Uint8Array<ArrayBuffer> {
  const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const subscriptionInfo = (
  subscription: PushSubscription
): PushSubscriptionInfo => {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: json.keys ?? {},
  };
};

/** iPhone and iPad, including iPads that present themselves as a Mac. */
const isAppleMobile = () =>
  getPlatform() === "ios" ||
  (/\bMacintosh\b/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

function readDevice(): DeviceRecord | null {
  try {
    const raw = safeLocalStorage.getItem(PUSH_DEVICE_STORAGE_KEY);
    const parsed = DEVICE_SCHEMA.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type Environment =
  | { kind: "checking" }
  | { kind: "unsupported" }
  | { kind: "needs-install" }
  | { kind: "ready"; registration: ServiceWorkerRegistration };

type CasualOSResult = { success: boolean; errorCode?: string };

export function createPushNotificationsManager(
  options: CreatePushNotificationsManagerOptions
): PushNotificationsManager {
  const { os, login, onPushReceived } = options;
  const now = options.now ?? Date.now;
  const serviceWorkerTimeoutMs = options.serviceWorkerTimeoutMs ?? 10_000;

  const hydrated = signal(false);
  const environment = signal<Environment>({ kind: "checking" });
  /** Undefined until the relay answers; null when it's off or didn't answer. */
  const relay = signal<PushRelayConfig | null | undefined>(undefined);
  const casualosUnsupported = signal(false);
  const permission = signal<NotificationPermission>("default");
  /** This browser's push subscription, if it has one. */
  const endpoint = signal<string | null>(null);
  const device = signal<DeviceRecord | null>(null);
  /** False until this browser's subscription has been looked at once. */
  const checked = signal(false);
  const busy = signal(false);
  const error = signal<PushNotificationError | null>(null);

  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();
  let reconcileQueued = false;
  const cleanups: (() => void)[] = [];

  const status = computed<PushNotificationStatus>(() => {
    const env = environment.value;
    if (!hydrated.value || env.kind === "checking") {
      return "checking";
    }
    if (env.kind === "unsupported") {
      return "unsupported";
    }
    const config = relay.value;
    if (config === undefined) {
      return "checking";
    }
    if (config === null || casualosUnsupported.value) {
      return "unconfigured";
    }
    const userId = login.userId.value;
    if (!userId) {
      return "signed-out";
    }
    if (env.kind === "needs-install") {
      return "needs-install";
    }
    if (permission.value === "denied") {
      return "denied";
    }
    if (!checked.value) {
      return "checking";
    }
    const record = device.value;
    return permission.value === "granted" &&
      !!record &&
      record.userId === userId &&
      record.endpoint === endpoint.value
      ? "on"
      : "off";
  });

  const writeDevice = (record: DeviceRecord | null) => {
    device.value = record;
    try {
      if (record) {
        safeLocalStorage.setItem(
          PUSH_DEVICE_STORAGE_KEY,
          JSON.stringify(record)
        );
      } else {
        safeLocalStorage.removeItem(PUSH_DEVICE_STORAGE_KEY);
      }
    } catch (storageError) {
      console.warn(
        "Could not save the push subscription's owner:",
        storageError
      );
    }
  };

  /** Runs `task` after any other push task, in this tab and others. */
  const serially = <T,>(task: () => Promise<T>): Promise<T> => {
    const run = () => {
      const locks =
        typeof navigator !== "undefined" ? navigator.locks : undefined;
      return locks ? locks.request(PUSH_LOCK, task) : task();
    };
    const result = queue.then(run, run);
    queue = result.catch(() => {});
    return result;
  };

  // ─── The relay's config ────────────────────────────────────────────────────

  let configRequest: Promise<PushRelayConfig | null | "unknown"> | null = null;
  /**
   * The relay's config, read once per page load. "unknown" when it couldn't
   * be read, which is tried again next time.
   */
  const loadConfig = () => {
    configRequest ??= fetch(CONFIG_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return CONFIG_SCHEMA.parse(await response.json()).push;
      })
      .catch((configError: unknown) => {
        console.warn(
          "Could not read the push notification config:",
          configError
        );
        configRequest = null;
        return "unknown" as const;
      })
      .then((config) => {
        relay.value = config === "unknown" ? null : config;
        return config;
      });
    return configRequest;
  };

  // ─── This device ───────────────────────────────────────────────────────────

  const findRegistration =
    async (): Promise<ServiceWorkerRegistration | null> => {
      const container = navigator.serviceWorker;
      const existing = await container.getRegistration().catch(() => undefined);
      if (existing) {
        return existing;
      }
      // `ready` never settles where no worker is ever registered.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const gaveUp = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), serviceWorkerTimeoutMs);
      });
      try {
        return await Promise.race([container.ready, gaveUp]);
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    };

  const detectEnvironment = async (): Promise<Environment> => {
    if (!("serviceWorker" in navigator)) {
      return { kind: "unsupported" };
    }
    const registration = await findRegistration();
    if (!registration) {
      return { kind: "unsupported" };
    }
    // Safari on iPhone and iPad only offers push to the Home Screen app, and
    // hides the push APIs everywhere else.
    if (isAppleMobile() && !isStandalone()) {
      return { kind: "needs-install" };
    }
    if (
      !("PushManager" in window) ||
      !registration.pushManager ||
      typeof Notification === "undefined"
    ) {
      return { kind: "unsupported" };
    }
    return { kind: "ready", registration };
  };

  const registrationIfReady = () => {
    const env = environment.peek();
    return env.kind === "ready" ? env.registration : null;
  };

  /**
   * Brings this browser's subscription in line with who's signed in: drops
   * one that isn't the signed-in user's, and keeps theirs registered with
   * CasualOS and allowed for the current notifier.
   */
  const reconcile = async () => {
    const registration = registrationIfReady();
    if (!registration || disposed) {
      return;
    }
    permission.value = Notification.permission;
    // Another tab may have changed it.
    let record = readDevice();
    device.value = record;
    let subscription = await registration.pushManager
      .getSubscription()
      .catch(() => null);
    const userId = login.userId.peek();

    if (subscription && (!record || !userId || record.userId !== userId)) {
      // Left by an account that has signed out, or that this browser can't
      // tell: CasualOS keeps sending it that account's pushes until the
      // browser drops the subscription itself.
      const dropped = await subscription.unsubscribe().catch(() => false);
      if (!dropped) {
        console.warn("Could not end the previous account's push subscription.");
      }
      subscription = null;
    }
    if (!subscription || !record || record.userId !== userId) {
      if (record) {
        writeDevice(null);
        record = null;
      }
      endpoint.value = subscription?.endpoint ?? null;
      return;
    }

    const loaded = await loadConfig();
    const config = loaded === "unknown" ? null : loaded;
    if (
      record.endpoint !== subscription.endpoint ||
      now() - record.registeredAtMs >= REREGISTER_INTERVAL_MS
    ) {
      // A changed endpoint is the browser renewing the subscription; the new
      // one belongs to nobody until it's registered.
      const result: CasualOSResult = await os
        .registerPushSubscription(subscriptionInfo(subscription))
        .catch(() => ({ success: false, errorCode: "network_error" }));
      if (login.userId.peek() !== userId) {
        return;
      }
      if (result.success) {
        record = {
          ...record,
          endpoint: subscription.endpoint,
          registeredAtMs: now(),
        };
        writeDevice(record);
      } else {
        console.warn("Could not re-register for push:", result.errorCode);
      }
    }
    if (config && record.notifierUserId !== config.notifierUserId) {
      const result: CasualOSResult = await os
        .grantNotificationSendPermission(
          userId,
          config.inboxAddress,
          config.notifierUserId
        )
        .catch(() => ({ success: false, errorCode: "network_error" }));
      if (result.success && login.userId.peek() === userId) {
        record = { ...record, notifierUserId: config.notifierUserId };
        writeDevice(record);
      }
    }
    endpoint.value = subscription.endpoint;
  };

  const scheduleReconcile = () => {
    if (reconcileQueued) {
      return;
    }
    reconcileQueued = true;
    void serially(async () => {
      reconcileQueued = false;
      try {
        await reconcile();
      } catch (reconcileError) {
        console.warn(
          "Could not check this device's push subscription:",
          reconcileError
        );
      } finally {
        checked.value = true;
      }
    });
  };

  // Signing out, or another account signing in, is noticed here, as is the
  // account already signed in when the app starts.
  let followedUserId: string | null | undefined;
  const stopFollowingAccount = effect(() => {
    if (!hydrated.value || environment.value.kind !== "ready") {
      return;
    }
    const userId = login.userId.value;
    if (userId !== followedUserId) {
      followedUserId = userId;
      scheduleReconcile();
    }
  });

  // ─── Turning it on and off ─────────────────────────────────────────────────

  const subscribe = async (
    userId: string,
    config: PushRelayConfig,
    registration: ServiceWorkerRegistration
  ) => {
    const stillSignedIn = () => login.userId.peek() === userId;
    let subscription: PushSubscription | null = null;
    const fail = async (reason: PushNotificationError, detail: unknown) => {
      console.warn("Could not turn on push notifications:", detail);
      await subscription?.unsubscribe().catch(() => false);
      endpoint.value = null;
      if (stillSignedIn()) {
        error.value = reason;
      }
    };

    try {
      const key = await os.getPushApplicationServerKey();
      if (!key.success) {
        if (key.errorCode === "not_supported") {
          casualosUnsupported.value = true;
          return fail("unavailable", key.errorCode);
        }
        return fail("failed", key.errorCode);
      }

      // Always a new subscription: one this browser already has may still be
      // linked to another account, which CasualOS would keep pushing to it.
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }
      writeDevice(null);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKeyBytes(key.key),
      });

      const info = subscriptionInfo(subscription);
      const steps: [string, () => Promise<CasualOSResult>][] = [
        [
          // `private`: only the account itself can subscribe to its inbox or
          // see who has.
          "recordNotification",
          () =>
            os.recordNotification(userId, config.inboxAddress, {
              description: "Seed Bible notifications for this account",
              marker: "private",
            }),
        ],
        [
          "subscribeToNotification",
          () => os.subscribeToNotification(userId, config.inboxAddress, info),
        ],
        [
          // Lets the notifier send to the inbox, and do nothing else.
          "grantPermission",
          () =>
            os.grantNotificationSendPermission(
              userId,
              config.inboxAddress,
              config.notifierUserId
            ),
        ],
      ];
      for (const [name, step] of steps) {
        const result = await step();
        if (!stillSignedIn()) {
          return fail("failed", "signed in as someone else");
        }
        if (!result.success) {
          return fail("failed", `${name}: ${result.errorCode}`);
        }
      }

      writeDevice({
        userId,
        endpoint: subscription.endpoint,
        notifierUserId: config.notifierUserId,
        registeredAtMs: now(),
      });
      endpoint.value = subscription.endpoint;
      captureEvent("push_notifications_enabled");
    } catch (subscribeError) {
      await fail("failed", subscribeError);
    }
  };

  const enable = async () => {
    const userId = login.userId.peek();
    const config = relay.peek();
    const registration = registrationIfReady();
    if (
      busy.peek() ||
      status.peek() === "on" ||
      !userId ||
      !config ||
      !registration
    ) {
      return;
    }
    batch(() => {
      busy.value = true;
      error.value = null;
    });
    try {
      // Asked before anything else is awaited, while this still counts as
      // part of the tap.
      const answer =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      permission.value = answer;
      if (answer !== "granted") {
        if (answer === "default") {
          error.value = "dismissed";
        }
        return;
      }
      await serially(() => subscribe(userId, config, registration));
    } catch (permissionError) {
      console.warn(
        "Could not ask for notification permission:",
        permissionError
      );
      error.value = "failed";
    } finally {
      busy.value = false;
    }
  };

  const disable = async () => {
    const registration = registrationIfReady();
    if (busy.peek() || !registration) {
      return;
    }
    batch(() => {
      busy.value = true;
      error.value = null;
    });
    try {
      // Only this browser's subscription ends. `unsubscribeFromNotification`
      // would end the account's subscription to its inbox, which turns push
      // off on every one of its devices at once; the notifier keeps its
      // permission for the same reason.
      await serially(async () => {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && !(await subscription.unsubscribe())) {
          throw new Error("The browser kept the push subscription");
        }
        writeDevice(null);
        endpoint.value = null;
      });
      captureEvent("push_notifications_disabled");
    } catch (disableError) {
      console.warn("Could not turn off push notifications:", disableError);
      error.value = "failed";
    } finally {
      busy.value = false;
    }
  };

  // ─── Telling the relay ─────────────────────────────────────────────────────

  const notifyFriendRequestSent = async (requestId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      // When the config couldn't be read, trying costs one request; skipping
      // would lose the push.
      if ((await loadConfig()) === null) {
        return;
      }
      const sessionKey = os.sessionKey.peek();
      if (!sessionKey) {
        return;
      }
      const response = await fetch(FRIEND_REQUEST_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionKey}`,
        },
        body: JSON.stringify({ requestId }),
        // Still delivered if the person leaves the page right after sending.
        keepalive: true,
      });
      if (!response.ok) {
        console.warn(
          `The friend request push wasn't sent (HTTP ${response.status}).`
        );
      }
    } catch (notifyError) {
      console.warn("Could not ask for a friend request push:", notifyError);
    }
  };

  // ─── Starting up ───────────────────────────────────────────────────────────

  const listen = (
    target: EventTarget,
    type: string,
    listener: (event: Event) => void
  ) => {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  };

  const hydrate = () => {
    if (hydrated.peek() || typeof window === "undefined") {
      return;
    }
    batch(() => {
      hydrated.value = true;
      device.value = readDevice();
    });

    if ("serviceWorker" in navigator) {
      listen(navigator.serviceWorker, "message", (event) => {
        const data = (event as MessageEvent).data as { type?: unknown } | null;
        if (data?.type === PUSH_RECEIVED_MESSAGE) {
          onPushReceived?.();
        }
      });
      navigator.serviceWorker.startMessages?.();
    }
    // Permission can be changed in the browser's settings, and the browser
    // can drop a subscription, while the app is in the background.
    listen(document, "visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scheduleReconcile();
      }
    });
    listen(window, "storage", (event) => {
      if ((event as StorageEvent).key === PUSH_DEVICE_STORAGE_KEY) {
        scheduleReconcile();
      }
    });

    const detect = () =>
      detectEnvironment().then((found) => {
        if (disposed) {
          return found;
        }
        if (found.kind !== "unsupported") {
          void loadConfig();
        }
        batch(() => {
          if (found.kind === "ready") {
            permission.value = Notification.permission;
          }
          environment.value = found;
        });
        return found;
      });
    void detect().then((found) => {
      // On a first visit the worker only registers once the page has loaded,
      // which on a slow connection can be after `detectEnvironment` stopped
      // waiting. When it does turn up, look again.
      if (found.kind === "unsupported" && "serviceWorker" in navigator) {
        void navigator.serviceWorker.ready.then(() => {
          if (!disposed && environment.peek().kind === "unsupported") {
            void detect();
          }
        });
      }
    });
  };

  const dispose = () => {
    disposed = true;
    stopFollowingAccount();
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  };

  return {
    status,
    isBusy: computed(() => busy.value),
    error: computed(() => error.value),
    enable,
    disable,
    notifyFriendRequestSent,
    hydrate,
    dispose,
  };
}
