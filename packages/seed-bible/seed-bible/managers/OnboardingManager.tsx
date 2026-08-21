import { computed, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";

/**
 * The platform the app is currently running on. Used to decide how the app can
 * be installed:
 *  - "android" / "pc": support the `beforeinstallprompt` flow, so we can trigger
 *    the native install prompt via `os.promptToInstallPWA()`.
 *  - "ios": Safari has no programmatic install prompt, so we show "Add to Home
 *    Screen" instructions instead.
 */
export type Platform = "android" | "ios" | "pc";

/** Which onboarding modal is currently visible, if any. */
export type OnboardingStep = "install" | "done";

const INSTALL_DISMISSED_KEY = "sb-install-dismissed";

// Stored unprefixed on profile.config, matching the pattern set by
// SettingsManager for `fontSize`, `lang`, etc. Records that the user
// dismissed the install prompt ("Maybe later").
//
// Note: we intentionally do *not* persist "app installed" to localStorage or
// the profile. Browsers have no reliable cross-platform signal that a PWA was
// uninstalled, and sticky storage hid the Settings entry forever after a
// one-time install. "Installed" is only true while this session is standalone
// (or right after markInstalled() in the current page session).
const PROFILE_INSTALL_DISMISSED = "installPromptDismissed";

/**
 * Detects the current platform from the user agent. Mirrors the helper shared
 * by the design so install affordances match the device.
 */
export function getPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "pc";
  }

  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    (window as unknown as { opera?: string }).opera ||
    "";

  if (/android/i.test(ua)) {
    return "android";
  }

  if (
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  ) {
    return "ios";
  }

  return "pc";
}

/**
 * True when the app is already running as an installed PWA (standalone display
 * mode, or iOS' `navigator.standalone`). A standalone session is proof the
 * user has installed the app.
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const iosStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return iosStandalone || displayModeStandalone;
}

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, "true");
  } catch {
    // Best-effort — onboarding still works without persistence, it just may
    // show again on the next visit.
  }
}

export interface OnboardingManager {
  /** Detected platform, used to render the right install affordance. */
  platform: Platform;
  /** Whether the current session is running standalone (installed PWA). */
  standalone: boolean;
  /**
   * Whether the app is treated as installed for this session. True when the
   * session is already standalone, or after markInstalled() completes in this
   * page load. Not persisted — so a browser visit after uninstalling the PWA
   * shows install affordances again.
   */
  installed: ReadonlySignal<boolean>;
  /** The onboarding modal that should currently be shown. */
  step: ReadonlySignal<OnboardingStep>;
  /**
   * Whether the install prompt could be shown right now — not yet installed
   * and not previously dismissed. Used by the caller to decide whether to
   * call `openInstall()` once the tutorial has been resolved.
   */
  installAvailable: ReadonlySignal<boolean>;
  /** Dismisses the install prompt (either after installing or "maybe later"). */
  dismissInstall: () => void;
  /** Re-opens the install prompt on demand (e.g. from Settings, or once the tutorial is resolved). */
  openInstall: () => void;
  /**
   * Records that the user installed the app in this session (hides the
   * prompt/Settings entry until the next page load in a non-standalone tab).
   * Called when an install completes.
   */
  markInstalled: () => void;
}

/**
 * Drives the first-run onboarding flow: a device-appropriate "install to home
 * screen" prompt. Install is considered current only while running as a
 * standalone PWA (or immediately after an install in this session) — not via
 * sticky local/profile flags, so uninstalling the PWA restores install UI.
 *
 * The prompt does not show itself on startup — the caller decides when to
 * call `openInstall()` (e.g. once the tutorial has been resolved and the
 * reader is visible). `step` starts at `"done"`.
 */
export function createOnboardingManager(
  login: LoginManager
): OnboardingManager {
  const platform = getPlatform();
  const standalone = isStandalone();

  // Only true when this session is the installed app, or the user just
  // finished installing in this tab. Do not seed from localStorage/profile:
  // those outlive PWA uninstall and incorrectly hide Settings forever.
  const installedLocally = signal<boolean>(standalone);

  const installed = computed<boolean>(() => installedLocally.value);

  const markInstalled = () => {
    installedLocally.value = true;
  };

  // Whether the user dismissed the install prompt ("Maybe later"). Profile is
  // the source of truth when logged in, with a localStorage cache for
  // anonymous/offline use.
  const dismissedLocally = signal<boolean>(readFlag(INSTALL_DISMISSED_KEY));

  const dismissed = computed<boolean>(() => {
    if (dismissedLocally.value) {
      return true;
    }
    const fromProfile = getProfileConfigValue(
      login.profile.value,
      PROFILE_INSTALL_DISMISSED
    );
    return fromProfile === true || fromProfile === "true";
  });

  const installAvailable = computed<boolean>(
    () => !installed.value && !dismissed.value
  );

  // The prompt no longer auto-shows on startup — it starts resolved and the
  // caller opens it explicitly (Settings, or once the tutorial is resolved).
  const step = signal<OnboardingStep>("done");

  const dismissInstall = () => {
    writeFlag(INSTALL_DISMISSED_KEY);
    dismissedLocally.value = true;
    saveProfileConfigValue(login, PROFILE_INSTALL_DISMISSED, true);
    step.value = "done";
  };

  const openInstall = () => {
    step.value = "install";
  };

  return {
    platform,
    standalone,
    installed,
    step,
    installAvailable,
    dismissInstall,
    openInstall,
    markInstalled,
  };
}
