import { type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
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
/**
 * Detects the current platform from the user agent. Mirrors the helper shared
 * by the design so install affordances match the device.
 */
export declare function getPlatform(): Platform;
/**
 * True when the app is already running as an installed PWA (standalone display
 * mode, or iOS' `navigator.standalone`). A standalone session is proof the
 * user has installed the app.
 */
export declare function isStandalone(): boolean;
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
export declare function createOnboardingManager(
  login: LoginManager
): OnboardingManager;
