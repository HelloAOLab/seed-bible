import { toInAppUrl } from "../packages/seed-bible/seed-bible/app/publicLinks";

/**
 * How the native apps (`mobile/`) open links to the public website in the
 * app itself: links the operating system hands over (Universal Links on iOS,
 * App Links on Android) and links tapped inside the app. Wired up by
 * `standalone/native.ts`.
 */
export interface NativeLinkContext {
  /** The public website, e.g. "https://seedbible.org". */
  publicOrigin: string;
  /** The page's current address (`location.href`). */
  currentHref: () => string;
  /**
   * Loads `href` (an address in the app) from scratch. A link from outside
   * can carry things the app only reads while starting up (a session to
   * join, a customization), so an in-page URL change isn't enough.
   */
  reloadAt: (href: string, options: { replace: boolean }) => void;
  /** `sessionStorage`, or null where it's unavailable. */
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  now: () => number;
}

/** The launch link already acted on in this app session. */
const HANDLED_LAUNCH_URL_KEY = "sb-native-handled-launch-url";
/** The last link acted on, and when — see `DUPLICATE_WINDOW_MS`. */
const RECENT_LINK_KEY = "sb-native-recent-link";
/**
 * A cold start can report the same link twice — once as the launch link and
 * once as an "opened" event — and the first one reloads the page, so the
 * second arrives in a fresh page that has to recognise it.
 */
const DUPLICATE_WINDOW_MS = 10_000;

function readStorage(context: NativeLinkContext, key: string): string | null {
  try {
    return context.storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(
  context: NativeLinkContext,
  key: string,
  value: string
): void {
  try {
    context.storage?.setItem(key, value);
  } catch {
    // Without storage the only cost is that a duplicate report may reload
    // the page a second time.
  }
}

function isRecentDuplicate(url: string, context: NativeLinkContext): boolean {
  const raw = readStorage(context, RECENT_LINK_KEY);
  if (!raw) return false;
  try {
    const recent = JSON.parse(raw) as { url?: unknown; at?: unknown };
    return (
      recent.url === url &&
      typeof recent.at === "number" &&
      context.now() - recent.at < DUPLICATE_WINDOW_MS
    );
  } catch {
    return false;
  }
}

/**
 * Opens a link the operating system handed to the running app. Returns
 * whether it took the app anywhere; links to other sites are ignored.
 */
export function openLinkInApp(
  url: string,
  context: NativeLinkContext,
  options: { replace?: boolean } = {}
): boolean {
  const target = toInAppUrl(url, context.publicOrigin, context.currentHref());
  if (!target || isRecentDuplicate(url, context)) {
    return false;
  }
  writeStorage(
    context,
    RECENT_LINK_KEY,
    JSON.stringify({ url, at: context.now() })
  );
  context.reloadAt(target.href, { replace: options.replace ?? false });
  return true;
}

/**
 * Opens the link the app was launched with. The operating system keeps
 * reporting that same link for as long as the app stays running, including
 * after any later reload, so it is only acted on once per app session —
 * otherwise a reload would drag the reader back to it.
 */
export function openLaunchLinkInApp(
  url: string,
  context: NativeLinkContext
): boolean {
  if (readStorage(context, HANDLED_LAUNCH_URL_KEY) === url) {
    return false;
  }
  writeStorage(context, HANDLED_LAUNCH_URL_KEY, url);
  return openLinkInApp(url, context, { replace: true });
}

/**
 * Keeps a tapped link to the public website inside the app, the way a link to
 * the app's own address already behaves — for example a verse link saved in
 * a note on the website. Returns whether it took over the click.
 */
export function handleLinkClick(
  event: MouseEvent,
  context: Pick<NativeLinkContext, "publicOrigin" | "currentHref">,
  navigate: (href: string) => void
): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  const anchor =
    event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>("a[href]")
      : null;
  if (!anchor || anchor.hasAttribute("download")) {
    return false;
  }
  const target = toInAppUrl(
    anchor.href,
    context.publicOrigin,
    context.currentHref()
  );
  if (!target) {
    return false;
  }
  event.preventDefault();
  navigate(target.href);
  return true;
}
