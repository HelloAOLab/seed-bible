import { signal, type ReadonlySignal } from "@preact/signals";
import type { NavigationManager } from "../../managers/NavigationManager";

// The part of the developer tools every build carries: whether this browser
// has unlocked them. The tools themselves (devTools.ts and the Settings view)
// are separate chunks fetched only once someone unlocks them, and
// `script/check-dev-tools-bundle.ts` fails the build if they ever end up in
// what the app loads at startup.
//
// Dev builds are always unlocked. Elsewhere, seven quick taps on the version
// number in Settings, or opening any page with `?devTools`, unlocks them in
// that browser until "Hide developer settings" locks them again.

/**
 * Off in the iPhone and Android apps: app store review doesn't allow hidden
 * features, so those builds carry no way in.
 */
export const DEV_TOOLS_SUPPORTED = import.meta.env.MODE !== "native";

const IS_DEV_BUILD = import.meta.env.DEV === true;

export const DEV_TOOLS_URL_FLAG = "devTools";
const UNLOCKED_KEY = "sb-dev-tools-unlocked";
/** Which tools are on; written by devTools.ts. */
export const DEV_TOOLS_ON_KEY = "sb-dev-tools";

const TAPS_TO_UNLOCK = 7;
// A pause longer than this between taps starts the count again.
const MAX_TAP_GAP_MS = 1500;

const unlocked = signal(false);
export const devToolsUnlocked: ReadonlySignal<boolean> = unlocked;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads this browser's unlock at startup, unlocking first when the URL has
 * `?devTools`. Returns whether it did, so startup can take the flag back out
 * of the address once the page has hydrated: left in, it would ride along on
 * every link shared from the page.
 */
export function initDevToolsUnlock(): boolean {
  if (!DEV_TOOLS_SUPPORTED) return false;
  const fromUrl = new URLSearchParams(window.location.search).has(
    DEV_TOOLS_URL_FLAG
  );
  if (fromUrl) storage()?.setItem(UNLOCKED_KEY, "1");
  unlocked.value = IS_DEV_BUILD || storage()?.getItem(UNLOCKED_KEY) === "1";
  return fromUrl;
}

/**
 * Takes `?devTools` back out of the address. Run after hydrating, so the
 * client's first render matched the server's; replaced rather than pushed,
 * so Back doesn't bring it back.
 */
export function removeDevToolsFlag(
  navigation: Pick<NavigationManager, "currentUrl" | "replace">
) {
  const next = new URL(navigation.currentUrl.peek());
  next.searchParams.delete(DEV_TOOLS_URL_FLAG);
  navigation.replace(next);
}

export function unlockDevTools() {
  if (!DEV_TOOLS_SUPPORTED) return;
  storage()?.setItem(UNLOCKED_KEY, "1");
  unlocked.value = true;
}

/** Forgets the unlock and which tools were on. Dev builds stay unlocked. */
export function lockDevTools() {
  storage()?.removeItem(UNLOCKED_KEY);
  storage()?.removeItem(DEV_TOOLS_ON_KEY);
  unlocked.value = IS_DEV_BUILD;
}

/** Whether a tool was left on, so startup knows to fetch the tools. */
export function hasDevToolsOn(): boolean {
  try {
    const ids: unknown = JSON.parse(
      storage()?.getItem(DEV_TOOLS_ON_KEY) ?? "[]"
    );
    return Array.isArray(ids) && ids.length > 0;
  } catch {
    return false;
  }
}

let taps = 0;
let lastTapAt = 0;

/** Counts a tap on the version number; the seventh quick one unlocks. */
export function countUnlockTap() {
  if (!DEV_TOOLS_SUPPORTED || unlocked.peek()) return;
  const now = Date.now();
  taps = now - lastTapAt > MAX_TAP_GAP_MS ? 1 : taps + 1;
  lastTapAt = now;
  if (taps >= TAPS_TO_UNLOCK) {
    taps = 0;
    unlockDevTools();
  }
}
