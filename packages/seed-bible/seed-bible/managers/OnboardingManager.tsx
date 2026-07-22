import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
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
const APP_INSTALLED_KEY = "sb-app-installed";

// Stored unprefixed on profile.config, matching the pattern set by
// ConfigManager/SettingsManager for `fontSize`, `lang`, etc. These are the
// backend records of whether the user already has the app installed and
// whether they've dismissed the install prompt ("Maybe later").
const PROFILE_APP_INSTALLED = "appInstalled";
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
   * Whether the user already has the app installed. True when the session is
   * standalone, or when a previous install was recorded on the user's profile
   * (backend) or in the local cache. Reactive so the install prompt/option
   * disappear as soon as the profile loads or an install completes.
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
   * Records that the user has the app installed, persisting to their profile
   * (backend) and the local cache. Called when an install completes.
   */
  markInstalled: () => void;
}

/**
 * Drives the first-run onboarding flow: a device-appropriate "install to home
 * screen" prompt. Whether the user already has the app is recorded on their
 * profile so the prompt — and the Settings entry — are hidden once installed.
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

  // Local cache of the installed flag. Seeded from localStorage and from a
  // standalone session (which proves an install). The profile is the source
  // of truth when logged in; this cache covers anonymous/offline use.
  const installedLocally = signal<boolean>(
    standalone || readFlag(APP_INSTALLED_KEY)
  );

  const installed = computed<boolean>(() => {
    if (installedLocally.value) {
      return true;
    }
    const fromProfile = getProfileConfigValue(
      login.profile.value,
      PROFILE_APP_INSTALLED
    );
    return fromProfile === true || fromProfile === "true";
  });

  const markInstalled = () => {
    writeFlag(APP_INSTALLED_KEY);
    installedLocally.value = true;
    saveProfileConfigValue(login, PROFILE_APP_INSTALLED, true);
  };

  // A standalone session means the user installed the app on this device.
  // Persist that to the backend (once the profile is available) so it's
  // remembered across sessions/devices even if localStorage is cleared.
  effect(() => {
    if (!standalone || !login.userId.value) {
      return;
    }
    const fromProfile = getProfileConfigValue(
      login.profile.value,
      PROFILE_APP_INSTALLED
    );
    if (fromProfile !== true) {
      saveProfileConfigValue(login, PROFILE_APP_INSTALLED, true);
    }
  });

  // Whether the user dismissed the install prompt ("Maybe later"). Like the
  // installed flag, the profile is the source of truth when logged in, with a
  // localStorage cache for anonymous/offline use.
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
