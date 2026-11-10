/**
 * What the service worker does with a push and with a tap on its
 * notification, as plain functions `sw.ts` wires up (docs/notifications.md
 * §7.3). Kept free of worker-only and DOM-only types, and of app code, so it
 * compiles under both tsconfigs and can be unit-tested directly.
 *
 * A push's data is the payload the relay (`server/notifications.ts`) handed
 * to CasualOS's `sendNotification`, passed through unchanged.
 */

/**
 * Posted to every open Seed Bible window when a push arrives, so it can
 * refresh. `PushNotificationsManager` listens for the same string.
 */
export const PUSH_RECEIVED_MESSAGE = "sb-push-received";

/** Shown for a push whose data can't be read, which still has to show something. */
export const FALLBACK_PUSH_TITLE = "Seed Bible";
export const FALLBACK_PUSH_BODY = "You have a new notification";

export interface PushDisplay {
  title: string;
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    timestamp?: number;
    silent?: boolean;
    /** Where tapping the notification goes; always on this site. */
    data: { url: string };
  };
}

/** The parsed JSON of a push's data, or null when there's none or it isn't JSON. */
export function readPushData(data: { json(): unknown } | null | undefined) {
  if (!data) {
    return null;
  }
  try {
    return data.json();
  } catch {
    return null;
  }
}

/**
 * `url` when it's on `origin`, otherwise the site's home page. A push can name
 * any URL, but tapping one only ever opens Seed Bible.
 */
export function sameOriginUrl(url: unknown, origin: string): string {
  if (typeof url === "string") {
    try {
      const parsed = new URL(url, origin);
      if (parsed.origin === origin) {
        return parsed.href;
      }
    } catch {
      // Not a URL; falls through to the home page.
    }
  }
  return new URL("/", origin).href;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

/**
 * The notification to show for a push. Only an `open_url` action is
 * followed: a `webhook` action would have the device call a URL on the
 * sender's behalf, and extra action buttons aren't used.
 */
export function pushDisplay(payload: unknown, origin: string): PushDisplay {
  const p = (payload ?? {}) as Record<string, unknown>;
  const title = typeof payload === "object" ? text(p.title) : undefined;
  if (!title) {
    return {
      title: FALLBACK_PUSH_TITLE,
      options: {
        body: FALLBACK_PUSH_BODY,
        data: { url: sameOriginUrl(null, origin) },
      },
    };
  }
  const action = p.action as { type?: unknown; url?: unknown } | null;
  return {
    title,
    options: {
      body: text(p.body),
      icon: text(p.icon),
      badge: text(p.badge),
      tag: text(p.tag),
      timestamp:
        typeof p.timestamp === "number" && Number.isFinite(p.timestamp)
          ? p.timestamp
          : undefined,
      silent: typeof p.silent === "boolean" ? p.silent : undefined,
      data: {
        url: sameOriginUrl(
          action?.type === "open_url" ? action.url : null,
          origin
        ),
      },
    },
  };
}

/** Where a tapped notification goes, from the `data` `pushDisplay` gave it. */
export function notificationClickUrl(data: unknown, origin: string): string {
  return sameOriginUrl((data as { url?: unknown } | null)?.url, origin);
}

/** The parts of a `WindowClient` a tap uses. */
export interface WindowClientLike {
  url: string;
  focus(): Promise<unknown>;
  navigate?(url: string): Promise<unknown>;
}

export interface ClientsLike {
  matchAll(): Promise<readonly WindowClientLike[]>;
  openWindow(url: string): Promise<unknown>;
}

/**
 * Takes an open Seed Bible window to `url`, or opens one. Branch previews
 * (`/b/...`) are a different build, so a tap never takes one over.
 */
export async function openNotificationUrl(
  url: string,
  clients: ClientsLike
): Promise<void> {
  const windows = await clients.matchAll();
  const existing = windows.find(
    (client) => !new URL(client.url).pathname.startsWith("/b/")
  );
  if (existing) {
    try {
      await existing.focus();
      // `navigate` is missing in some browsers and refuses a window this
      // worker doesn't control; resolving null means it went nowhere.
      if (existing.navigate && (await existing.navigate(url)) !== null) {
        return;
      }
    } catch {
      // Falls back to a new window below.
    }
  }
  await clients.openWindow(url);
}
