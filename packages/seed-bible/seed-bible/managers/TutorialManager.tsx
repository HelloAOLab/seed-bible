import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import type { OnboardingManager } from "seed-bible.managers.OnboardingManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "seed-bible.managers.ProfileConfigSync";

const TUTORIAL_SEEN_KEY = "sb-tutorial-seen";

// Stored unprefixed on profile.config (matching `fontSize`, `appInstalled`,
// etc.) — the backend record that the user has completed/skipped the tour.
const PROFILE_TUTORIAL_SEEN = "tutorialSeen";

/** Where the popover sits relative to its highlighted target. */
export type TutorialPlacement = "top" | "bottom" | "left" | "right";

export interface TutorialStep {
  id: string;
  /** CSS selector for the element to spotlight. */
  target: string;
  /** i18n key + fallback for the step title. */
  titleKey: string;
  titleDefault: string;
  /** i18n key + fallback for the step body. */
  bodyKey: string;
  bodyDefault: string;
  /** Preferred popover placement; the component flips it if there's no room. */
  placement?: TutorialPlacement;
}

/**
 * The guided tour steps. This is the single place to edit copy or re-target a
 * step — each `target` is a CSS selector resolved against the live DOM, and the
 * text is rendered through i18n with the given fallback. Steps whose target
 * isn't on screen are skipped automatically.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "selector",
    target: ".sb-bible-reader-title",
    titleKey: "tutorial.selectorTitle",
    titleDefault: "Select books & chapters",
    bodyKey: "tutorial.selectorBody",
    bodyDefault:
      "Tap the title to open the picker and jump to any book, chapter, or translation.",
    placement: "bottom",
  },
  {
    id: "tabs",
    target: ".sb-sidebar-tabs-header",
    titleKey: "tutorial.tabsTitle",
    titleDefault: "Manage tabs",
    bodyKey: "tutorial.tabsBody",
    bodyDefault:
      "Your open passages live here. Switch between them or filter to your bookmarks.",
    placement: "right",
  },
  {
    id: "add-tab",
    target: ".sb-tab-add-button",
    titleKey: "tutorial.addTabTitle",
    titleDefault: "Open more passages",
    bodyKey: "tutorial.addTabBody",
    bodyDefault:
      "Add a new tab to read several books or translations side by side.",
    placement: "left",
  },
  {
    id: "toolbar",
    target: ".sb-reader-toolbar",
    titleKey: "tutorial.toolbarTitle",
    titleDefault: "Reading tools",
    bodyKey: "tutorial.toolbarBody",
    bodyDefault:
      "Navigate chapters, search, and open study tools from the toolbar.",
    placement: "top",
  },
  {
    id: "settings",
    target: '[data-tutorial="settings"]',
    titleKey: "tutorial.settingsTitle",
    titleDefault: "Settings & install",
    bodyKey: "tutorial.settingsBody",
    bodyDefault:
      "Customize themes, text, and more here — and install the app to your device.",
    placement: "right",
  },
];

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
    // Best-effort; the profile record is the durable source of truth.
  }
}

export interface TutorialManager {
  /** All steps in order. */
  steps: TutorialStep[];
  /** Whether the tour is currently showing. */
  running: ReadonlySignal<boolean>;
  /** Index of the active step while running. */
  index: ReadonlySignal<number>;
  /** The active step, or null when not running. */
  currentStep: ReadonlySignal<TutorialStep | null>;
  /** Whether the user has already completed/skipped the tour (profile/local). */
  completed: ReadonlySignal<boolean>;
  /** Starts (or restarts) the tour from the first step. */
  start: () => void;
  /** Advances to the next step, finishing after the last one. */
  next: () => void;
  /** Goes back one step (no-op on the first). */
  prev: () => void;
  /** Ends the tour and records it as seen. */
  finish: () => void;
}

/**
 * Drives the guided coachmark tour. Auto-starts once for new users after the
 * welcome/install onboarding has finished, and can be replayed from Settings.
 * Completion is recorded on the user's profile (backend) plus a local cache.
 */
export function createTutorialManager(
  login: LoginManager,
  onboarding: OnboardingManager
): TutorialManager {
  const running = signal<boolean>(false);
  const index = signal<number>(0);

  const seenLocally = signal<boolean>(readFlag(TUTORIAL_SEEN_KEY));

  const completed = computed<boolean>(() => {
    if (seenLocally.value) {
      return true;
    }
    const fromProfile = getProfileConfigValue(
      login.profile.value,
      PROFILE_TUTORIAL_SEEN
    );
    return fromProfile === true || fromProfile === "true";
  });

  const currentStep = computed<TutorialStep | null>(() =>
    running.value ? (TUTORIAL_STEPS[index.value] ?? null) : null
  );

  const markSeen = () => {
    writeFlag(TUTORIAL_SEEN_KEY);
    seenLocally.value = true;
    saveProfileConfigValue(login, PROFILE_TUTORIAL_SEEN, true);
  };

  const start = () => {
    if (TUTORIAL_STEPS.length === 0) {
      return;
    }
    index.value = 0;
    running.value = true;
  };

  const finish = () => {
    running.value = false;
    markSeen();
  };

  const next = () => {
    if (index.value >= TUTORIAL_STEPS.length - 1) {
      finish();
      return;
    }
    index.value += 1;
  };

  const prev = () => {
    if (index.value > 0) {
      index.value -= 1;
    }
  };

  // Auto-start once for new users, but only after the welcome/install
  // onboarding is out of the way, and (when logged in) after the profile has
  // loaded — otherwise a returning user could see the tour flash before their
  // recorded completion arrives. One-shot via `autoStartChecked`.
  let autoStartChecked = false;
  effect(() => {
    if (autoStartChecked || running.value) {
      return;
    }
    if (onboarding.step.value !== "done") {
      return;
    }
    if (login.userId.value && login.profile.value === null) {
      return;
    }
    autoStartChecked = true;
    if (!completed.value) {
      start();
    }
  });

  return {
    steps: TUTORIAL_STEPS,
    running,
    index,
    currentStep,
    completed,
    start,
    next,
    prev,
    finish,
  };
}
