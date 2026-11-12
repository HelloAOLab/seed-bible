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
  /** When this page loaded, in the same clock as `now`. */
  pageStartedAt: number;
}

/** The launch link already acted on in this app session. */
const HANDLED_LAUNCH_URL_KEY = "sb-native-handled-launch-url";
/** The link that last restarted the app, and when. */
const RESTART_LINK_KEY = "sb-native-restart-link";
/**
 * A cold start can report the same link twice — once as the launch link and
 * once as an "opened" event. The first one restarts the page, so the second
 * can arrive in the restarted page, as soon as it starts listening. Only a
 * report that early, of the link that just restarted the page, counts as that
 * repeat: anything later is the reader tapping the link again.
 */
const DUPLICATE_AFTER_RESTART_MS = 3_000;

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

function isDuplicateReport(url: string, context: NativeLinkContext): boolean {
  const raw = readStorage(context, RESTART_LINK_KEY);
  if (!raw) return false;
  let restart: { url?: unknown; at?: unknown };
  try {
    restart = JSON.parse(raw);
  } catch {
    return false;
  }
  if (restart.url !== url || typeof restart.at !== "number") {
    return false;
  }
  // This page is already restarting for this link.
  if (restart.at >= context.pageStartedAt) {
    return true;
  }
  const restartedThisPage =
    context.pageStartedAt - restart.at < DUPLICATE_AFTER_RESTART_MS;
  const soonAfterStart =
    context.now() - context.pageStartedAt < DUPLICATE_AFTER_RESTART_MS;
  if (restartedThisPage && soonAfterStart) {
    // Swallow the repeat once; a later tap on the same link opens it again.
    writeStorage(context, RESTART_LINK_KEY, "");
    return true;
  }
  return false;
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
  if (!target || isDuplicateReport(url, context)) {
    return false;
  }
  writeStorage(
    context,
    RESTART_LINK_KEY,
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

/** Query parameters the running app picks up from an in-page address change. */
const IN_PAGE_PARAMS = new Set(["verse"]);

/**
 * Whether opening `url` needs a restart: it carries something the app only
 * reads while starting up, such as `?sessionId=` or `?customization=`. Only
 * plain passage links are known to be safe to open in place.
 */
export function needsRestart(url: URL): boolean {
  return [...url.searchParams.keys()].some((key) => !IN_PAGE_PARAMS.has(key));
}

/**
 * Keeps a tapped link to the public website inside the app — for example a
 * verse link, or a session invite, saved in a note on the website. A passage
 * link opens in place, the way a link to the app's own address does;
 * anything else restarts the app at it (see `needsRestart`). Returns whether
 * it took over the click.
 */
export function handleLinkClick(
  event: MouseEvent,
  context: Pick<NativeLinkContext, "publicOrigin" | "currentHref" | "reloadAt">,
  navigateInPlace: (href: string) => void
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
  if (needsRestart(target)) {
    context.reloadAt(target.href, { replace: false });
  } else {
    navigateInPlace(target.href);
  }
  return true;
}
