import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import type { OnboardingManager } from "seed-bible.managers.OnboardingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
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
  /** Optional side effect run when the step becomes active (e.g. open a panel). */
  onEnter?: () => void;
  /** Optional cleanup run when leaving the step (e.g. close that panel). */
  onLeave?: () => void;
  /**
   * Steps whose target lives inside the book-selector portal are grouped as
   * "selector" so the tour overlay can render in that same portal (otherwise it
   * would be hidden behind the selector, which is its own stacking context).
   */
  group?: "selector";
}

/**
 * The guided tour steps. This is the single place to edit copy or re-target a
 * step — each `target` is a CSS selector resolved against the live DOM, and the
 * text is rendered through i18n with the given fallback. Steps whose target
 * isn't on screen are skipped automatically.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "selector-books",
    target: ".sidebar-results",
    titleKey: "tutorial.selectorBooksTitle",
    titleDefault: "Select books and chapters",
    bodyKey: "tutorial.selectorBooksBody",
    bodyDefault: "Choose a chapter from here to begin your reading journey.",
    placement: "right",
    group: "selector",
  },
  {
    id: "selector-translation",
    target: ".sidebar-translation-selector",
    titleKey: "tutorial.selectorTranslationTitle",
    titleDefault: "Select bible translations",
    bodyKey: "tutorial.selectorTranslationBody",
    bodyDefault: "Choose from any of the available Bible translation versions.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "selector-testament",
    target: ".dropdown",
    titleKey: "tutorial.selectorTestamentTitle",
    titleDefault: "Filter by testament",
    bodyKey: "tutorial.selectorTestamentBody",
    bodyDefault: "Show all books, or narrow to just the Old or New Testament.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "selector-search",
    target: ".searchbar",
    titleKey: "tutorial.selectorSearchTitle",
    titleDefault: "Search by",
    bodyKey: "tutorial.selectorSearchBody",
    bodyDefault: "Search by chapter, verse or book from here.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "pane-layout",
    // The menu is opened by the Sidebar while this step is active; spotlight it
    // (it holds the layout options) rather than just the button that opens it.
    target: ".sb-pane-layout-menu",
    titleKey: "tutorial.paneLayoutTitle",
    titleDefault: "Arrange your panes",
    bodyKey: "tutorial.paneLayoutBody",
    bodyDefault:
      "Choose how many passages to read side by side from this layout menu.",
    placement: "right",
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

/**
 * The mobile tour. Below 768px the desktop selector sub-controls (translation,
 * testament, search) and the pane-layout menu aren't rendered, and the chrome
 * is different — so mobile gets its own step list targeting the mobile header,
 * the book selector grid, and the bottom toolbar. The book step reuses the
 * `selector-books` id so the selector's built-in spotlight/open logic applies.
 */
export const MOBILE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "m-passage",
    target: ".sb-bible-reader-mobile-header-title",
    titleKey: "tutorial.mobilePassageTitle",
    titleDefault: "Your current passage",
    bodyKey: "tutorial.mobilePassageBody",
    bodyDefault: "Tap the book name to jump to a different book or chapter.",
    placement: "bottom",
  },
  {
    id: "selector-books",
    target: ".sidebar-results",
    titleKey: "tutorial.selectorBooksTitle",
    titleDefault: "Select books and chapters",
    bodyKey: "tutorial.selectorBooksBody",
    bodyDefault: "Choose a chapter from here to begin your reading journey.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "toolbar",
    target: ".sb-reader-toolbar",
    titleKey: "tutorial.toolbarTitle",
    titleDefault: "Reading tools",
    bodyKey: "tutorial.mobileToolbarBody",
    bodyDefault:
      "Switch between the Bible, search, and more from the bottom bar.",
    placement: "top",
  },
  {
    id: "m-settings",
    target: ".sb-bible-reader-mobile-header-settings",
    titleKey: "tutorial.mobileSettingsTitle",
    titleDefault: "Settings",
    bodyKey: "tutorial.mobileSettingsBody",
    bodyDefault: "Customize text, themes, and reading options here.",
    placement: "bottom",
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
  onboarding: OnboardingManager,
  selector: BibleSelectorState
): TutorialManager {
  const running = signal<boolean>(false);
  const index = signal<number>(0);

  // The active step set is chosen by viewport at `start()` (snapshotted in
  // `mode`, so a resize mid-tour doesn't swap the steps out from under us).
  const mode = signal<"desktop" | "mobile">("desktop");
  const activeSteps = computed<TutorialStep[]>(() =>
    mode.value === "mobile" ? MOBILE_TUTORIAL_STEPS : TUTORIAL_STEPS
  );

  // Steps that spotlight elements inside the book selector. The selector is
  // kept open for the whole group (no open/close flicker between them) and
  // closed again once the tour moves past it.
  const SELECTOR_GROUP = new Set([
    "selector-books",
    "selector-translation",
    "selector-testament",
    "selector-search",
  ]);

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
    running.value ? (activeSteps.value[index.value] ?? null) : null
  );

  // Run each step's onEnter when it becomes active and the previous step's
  // onLeave when moving away (including when the tour ends).
  let prevStepId: string | null = null;
  effect(() => {
    const active = running.value
      ? (activeSteps.value[index.value] ?? null)
      : null;
    const activeId = active?.id ?? null;
    if (activeId === prevStepId) {
      return;
    }
    activeSteps.value.find((s) => s.id === prevStepId)?.onLeave?.();
    active?.onEnter?.();
    prevStepId = activeId;
  });

  // Keep the book selector open while any selector-group step is active, and
  // close it (only if the tour opened it) once the tour moves past the group.
  // Clicking the reader title reuses the app's own open logic (correct pane).
  let selectorOpenedByTour = false;
  effect(() => {
    const active = running.value
      ? (activeSteps.value[index.value] ?? null)
      : null;
    const inGroup = active ? SELECTOR_GROUP.has(active.id) : false;
    if (inGroup) {
      if (!selector.isOpen.value) {
        // Desktop opens via the reader title; mobile via the mobile header's
        // book label. Either reuses the app's own open logic (correct pane).
        const title = (document.querySelector(".sb-bible-reader-title") ??
          document.querySelector(
            ".sb-bible-reader-mobile-header-book"
          )) as HTMLElement | null;
        title?.click();
        selectorOpenedByTour = true;
      }
    } else if (selectorOpenedByTour) {
      void selector.setOpen(false);
      selectorOpenedByTour = false;
    }
  });

  // Open the translation dropdown while its step is active so the tour shows it
  // expanded, and collapse it again when the tour moves on (only if the tour
  // opened it — don't fight a user who opened it themselves).
  let translationOpenedByTour = false;
  effect(() => {
    const active = running.value
      ? (activeSteps.value[index.value] ?? null)
      : null;
    const wantTranslation = active?.id === "selector-translation";
    if (wantTranslation) {
      if (!selector.selectingTranslation.value) {
        selector.selectingTranslation.value = true;
        translationOpenedByTour = true;
      }
    } else if (translationOpenedByTour) {
      selector.selectingTranslation.value = false;
      translationOpenedByTour = false;
    }
  });

  const markSeen = () => {
    writeFlag(TUTORIAL_SEEN_KEY);
    seenLocally.value = true;
    saveProfileConfigValue(login, PROFILE_TUTORIAL_SEEN, true);
  };

  const start = () => {
    // Pick the step set for the current viewport before showing the tour.
    mode.value = selector.viewportWidth.value <= 768 ? "mobile" : "desktop";
    if (activeSteps.value.length === 0) {
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
    if (index.value >= activeSteps.value.length - 1) {
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
    get steps() {
      return activeSteps.value;
    },
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
