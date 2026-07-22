import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import type { PanesManager } from "../managers/PanesManager";
import { createSidebar } from "../managers/SidebarManager";
import {
  getProfileConfigValue,
  saveProfileConfigValue,
} from "../managers/ProfileConfigSync";

type SidebarManager = ReturnType<typeof createSidebar>;

const TUTORIAL_SEEN_KEY = "sb-tutorial-seen";
const TUTORIAL_OPTED_OUT_KEY = "sb-tutorial-opted-out";
const TUTORIAL_FEATURES_KEY = "sb-tutorial-features-seen";

// Stored unprefixed on profile.config (matching `fontSize`, `appInstalled`,
// etc.) — the backend record that the user has completed/skipped the tour.
const PROFILE_TUTORIAL_SEEN = "tutorialSeen";
const PROFILE_TUTORIAL_OPTED_OUT = "tutorialOptedOut";
const PROFILE_TUTORIAL_FEATURES_SEEN = "tutorialFeaturesSeen";

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
  /**
   * Lifts the tour overlay above high z-index app panels (e.g. the mobile
   * settings sheet) so the spotlight + popover render on top of what's open,
   * instead of behind it. Used by contextual tips that fire while a panel is up.
   */
  elevated?: boolean;
}

/**
 * First-run onboarding tour: just the basics needed to start reading. Advanced
 * surfaces (pane layout, add-tab, search) are taught contextually the first
 * time the user interacts with them — see CONTEXTUAL_TUTORIALS.
 */
export const ONBOARDING_STEPS: TutorialStep[] = [
  {
    id: "selector-books",
    target: ".sidebar-results",
    titleKey: "tutorial.selectorBooksTitle",
    titleDefault: "Select books and chapters",
    bodyKey: "tutorial.selectorBooksBody",
    bodyDefault: "Choose a chapter from here to begin reading.",
    placement: "top",
    group: "selector",
  },
  {
    id: "selector-translation",
    target: ".sidebar-translation-selector",
    titleKey: "tutorial.selectorTranslationTitle",
    titleDefault: "Select a Bible text",
    bodyKey: "tutorial.selectorTranslationBody",
    bodyDefault: "Choose from any of the available versions.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "selector-testament",
    target: ".dropdown",
    titleKey: "tutorial.selectorTestamentTitle",
    titleDefault: "Filter book options",
    bodyKey: "tutorial.selectorTestamentBody",
    bodyDefault:
      "Show all books, or narrow to just the Old Testament, New Testament, or extra-biblical writings.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "tabs",
    target: ".sb-sidebar-tabs-header",
    titleKey: "tutorial.tabsTitle",
    titleDefault: "Tabs and bookmarks",
    bodyKey: "tutorial.tabsBody",
    bodyDefault: "Your open passages and bookmarks live here.",
    placement: "right",
  },
  {
    id: "toolbar",
    target: ".sb-reader-toolbar",
    titleKey: "tutorial.toolbarTitle",
    titleDefault: "Toolbar",
    bodyKey: "tutorial.toolbarBody",
    bodyDefault:
      "You can customize the toolbar to your liking. By default, book selection, navigation, and search are built in.",
    placement: "top",
  },
  {
    id: "settings",
    target: '[data-tutorial="settings"]',
    titleKey: "tutorial.settingsTitle",
    titleDefault: "Settings",
    bodyKey: "tutorial.settingsBody",
    bodyDefault:
      "Customize themes, text, and more here, or install the app to your device.",
    placement: "right",
  },
];

/**
 * Back-compat alias. Some callers (settings page replay, mobile tour
 * fallbacks) still reference TUTORIAL_STEPS by name.
 */
export const TUTORIAL_STEPS = ONBOARDING_STEPS;

/**
 * The mobile tour. Below 480px the desktop selector sub-controls (translation,
 * testament) and the pane-layout menu aren't rendered, so mobile gets its own
 * step list targeting the mobile header, the book selector grid, and the
 * bottom toolbar. The book step reuses the `selector-books` id so the
 * selector's built-in spotlight/open logic applies.
 */
export const MOBILE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "m-passage",
    target: ".sb-bible-reader-mobile-header-title",
    titleKey: "tutorial.mobilePassageTitle",
    titleDefault: "Your current translation",
    bodyKey: "tutorial.mobilePassageBody",
    bodyDefault: "Tap the translation name to jump to a different translation.",
    placement: "bottom",
  },
  {
    id: "m-books",
    target: ".sb-reader-floating-nav-label",
    titleKey: "tutorial.mobileBooksTitle",
    titleDefault: "Your book/chapter selection",
    bodyKey: "tutorial.mobileBooksBody",
    bodyDefault: "Tap the book name to jump to a different book or chapter.",
    placement: "top",
  },
  {
    id: "selector-books",
    target: ".sidebar-results",
    titleKey: "tutorial.selectorBooksTitle",
    titleDefault: "Select books and chapters",
    bodyKey: "tutorial.selectorBooksBody",
    bodyDefault: "Choose a chapter from here to begin reading.",
    placement: "bottom",
    group: "selector",
  },
  {
    id: "toolbar",
    target: ".sb-reader-toolbar",
    titleKey: "tutorial.toolbarTitle",
    titleDefault: "Toolbar",
    bodyKey: "tutorial.mobileToolbarBody",
    bodyDefault:
      "Switch between the Bible, search, and more from the bottom bar.",
    placement: "top",
  },
  // Settings is taught contextually (CONTEXTUAL_TUTORIALS["mobile-settings"]) —
  // triggered when the user opens the settings sheet, not as a forced tour step.
  // (A modal tour overlay can't be tapped "through" to the real button, so the
  // tip is fired from the button's own handler instead.)
];

/**
 * Contextual single-feature tutorials. Triggered the first time the user
 * actually uses the feature (e.g. clicks the panels button), so we don't
 * front-load advanced UI in the first-run experience. Each feature gets its
 * own seen-flag so a completed/skipped contextual tour never reappears.
 */
export const CONTEXTUAL_TUTORIALS: Record<string, TutorialStep[]> = {
  "mobile-settings": [
    {
      id: "mobile-settings",
      // Fired from the settings button's own handler once the sheet is open, so
      // it spotlights what's now on screen. `elevated` lifts the tour layer above
      // the sheet (which sits at a very high z-index), otherwise the tip hides
      // behind it.
      target: ".sb-mobile-settings-sheet",
      titleKey: "tutorial.mobileSettingsTitle",
      titleDefault: "Settings",
      bodyKey: "tutorial.mobileSettingsBody",
      bodyDefault: "Customize text, themes, and reading options here.",
      placement: "top",
      elevated: true,
    },
  ],
  "pane-layout": [
    {
      id: "pane-layout",
      // The menu is opened by the Sidebar while this step is active; spotlight
      // it (it holds the layout options) rather than just the button.
      target: ".sb-pane-layout-menu",
      titleKey: "tutorial.paneLayoutTitle",
      titleDefault: "Arrange your panes",
      bodyKey: "tutorial.paneLayoutBody",
      bodyDefault:
        "Choose how many passages to read side by side from this layout menu.",
      placement: "right",
    },
  ],
  "add-tab": [
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
  ],
  search: [
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
  ],
};

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

function readFeaturesFlag(key: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
  } catch {
    // ignore
  }
  return {};
}

function writeFeaturesFlag(key: string, value: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort; profile record is the durable source of truth.
  }
}

/** Which tour is currently running — controls what `finish()` records. */
type TutorialMode = "onboarding-desktop" | "onboarding-mobile" | "contextual";

export interface TutorialManager {
  /** All steps in the currently active tour. */
  steps: TutorialStep[];
  /** Whether the tour is currently showing. */
  running: ReadonlySignal<boolean>;
  /** Index of the active step while running. */
  index: ReadonlySignal<number>;
  /** The active step, or null when not running. */
  currentStep: ReadonlySignal<TutorialStep | null>;
  /**
   * Whether the active step is the last in the linear queue (so its primary
   * button reads "Done"). Click-only interjections always report `true` — their
   * primary button just dismisses the tip back to the tour.
   */
  isLast: ReadonlySignal<boolean>;
  /** Whether the tour can step backwards from the active step. */
  canGoBack: ReadonlySignal<boolean>;
  /** Whether the user has already completed/skipped the onboarding tour. */
  completed: ReadonlySignal<boolean>;
  /** Whether the user has opted out of all future tutorial prompts. */
  optedOut: ReadonlySignal<boolean>;
  /**
   * Whether the first-run offer card ("Would you like a tutorial?") is showing.
   * Set once for new users after onboarding finishes, instead of launching the
   * tour unannounced. Resolved by {@link acceptPrompt} / {@link dismissPrompt}.
   */
  promptVisible: ReadonlySignal<boolean>;
  /** Per-feature contextual tutorial completion flags. */
  featuresSeen: ReadonlySignal<Record<string, boolean>>;
  /** Starts (or restarts) the onboarding tour from the first step. */
  start: () => void;
  /**
   * Starts a contextual single-feature tour, if not already seen and the user
   * hasn't opted out. Safe to call from event handlers without pre-checking.
   */
  startContextual: (featureId: string) => void;
  /** Advances to the next step, finishing after the last one. */
  next: () => void;
  /** Goes back one step (no-op on the first). */
  prev: () => void;
  /** Ends the tour, recording completion for the active tour type. */
  finish: () => void;
  /**
   * Ends the current tour and records that the user does not want future
   * tutorial prompts. Marks the onboarding tour completed too.
   */
  optOut: () => void;
  /** Accepts the first-run offer card: hides it and starts the onboarding tour. */
  acceptPrompt: () => void;
  /**
   * Declines the first-run offer card: hides it and records the onboarding tour
   * as seen (still replayable from Settings).
   */
  dismissPrompt: () => void;
}

/**
 * Drives the guided coachmark tour. Offers itself once for new users once the
 * reader is open to a chapter and visible (no fullscreen pane covering it),
 * and can be replayed from Settings. Completion is recorded on the user's
 * profile (backend) plus a local cache.
 */
export function createTutorialManager(
  login: LoginManager,
  readerVisible: ReadonlySignal<boolean>,
  selector: BibleSelectorState,
  isMobile: ReadonlySignal<boolean>,
  panes: PanesManager,
  sidebar: SidebarManager,
  joinedViaSessionLink = false
): TutorialManager {
  const running = signal<boolean>(false);
  const index = signal<number>(0);
  // First-run offer card visibility (see `promptVisible` in the interface).
  const promptVisible = signal<boolean>(false);

  // The active step set is chosen at `start()` / `startContextual()` time
  // (snapshotted so a resize mid-tour doesn't swap the steps out from under us).
  const mode = signal<TutorialMode>("onboarding-desktop");
  const activeFeatureId = signal<string | null>(null);
  const activeSteps = signal<TutorialStep[]>(ONBOARDING_STEPS);

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
  const optedOutLocally = signal<boolean>(readFlag(TUTORIAL_OPTED_OUT_KEY));
  const featuresSeenLocal = signal<Record<string, boolean>>(
    readFeaturesFlag(TUTORIAL_FEATURES_KEY)
  );

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

  const optedOut = computed<boolean>(() => {
    if (optedOutLocally.value) {
      return true;
    }
    const fromProfile = getProfileConfigValue(
      login.profile.value,
      PROFILE_TUTORIAL_OPTED_OUT
    );
    return fromProfile === true || fromProfile === "true";
  });

  const featuresSeen = computed<Record<string, boolean>>(() => {
    const local = featuresSeenLocal.value;
    const fromProfile = getProfileConfigValue(
      login.profile.value,
      PROFILE_TUTORIAL_FEATURES_SEEN
    );
    if (fromProfile && typeof fromProfile === "object") {
      return {
        ...(fromProfile as Record<string, boolean>),
        ...local,
      };
    }
    return local;
  });

  const currentStep = computed<TutorialStep | null>(() =>
    running.value ? (activeSteps.value[index.value] ?? null) : null
  );

  const isLast = computed<boolean>(
    () => running.value && index.value >= activeSteps.value.length - 1
  );

  const canGoBack = computed<boolean>(() => running.value && index.value > 0);

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

  const markOnboardingSeen = () => {
    writeFlag(TUTORIAL_SEEN_KEY);
    seenLocally.value = true;
    saveProfileConfigValue(login, PROFILE_TUTORIAL_SEEN, true);
  };

  const markFeatureSeen = (featureId: string) => {
    const next = { ...featuresSeenLocal.value, [featureId]: true };
    featuresSeenLocal.value = next;
    writeFeaturesFlag(TUTORIAL_FEATURES_KEY, next);

    // Merge with whatever the profile already has so we don't clobber other
    // features' flags written from another device.
    const existing = getProfileConfigValue(
      login.profile.value,
      PROFILE_TUTORIAL_FEATURES_SEEN
    );
    const base =
      existing && typeof existing === "object"
        ? (existing as Record<string, boolean>)
        : {};
    saveProfileConfigValue(login, PROFILE_TUTORIAL_FEATURES_SEEN, {
      ...base,
      [featureId]: true,
    });
  };

  const markOptedOut = () => {
    writeFlag(TUTORIAL_OPTED_OUT_KEY);
    optedOutLocally.value = true;
    saveProfileConfigValue(login, PROFILE_TUTORIAL_OPTED_OUT, true);
  };

  const start = () => {
    // Close whatever overlapping UI is up first — coach marks target the
    // normal reader UI, so a fullscreen pane (e.g. the Today screen) or an
    // open sidebar panel left up would hide the very elements being
    // highlighted. Mirrors the teardown `BibleReaderToolbar` does before
    // showing reader UI over the Today screen.
    sidebar.closeSearchPanel();
    sidebar.closeChatPanel();
    sidebar.closeSettings();
    sidebar.closeSidebar();
    panes.closeAll();

    // Pick the step set for the current viewport before showing the tour.
    mode.value = isMobile.value ? "onboarding-mobile" : "onboarding-desktop";
    activeSteps.value = isMobile.value
      ? MOBILE_TUTORIAL_STEPS
      : ONBOARDING_STEPS;
    activeFeatureId.value = null;
    if (activeSteps.value.length === 0) {
      return;
    }
    index.value = 0;
    running.value = true;
  };

  const startContextual = (featureId: string) => {
    if (running.value) {
      return;
    }
    // On a session-join tab, don't pop contextual coach marks. Not persisted,
    // so these tips still appear on a normal (non-session-link) visit later.
    if (joinedViaSessionLink) {
      return;
    }
    if (optedOut.value) {
      return;
    }
    if (featuresSeen.value[featureId]) {
      return;
    }
    const steps = CONTEXTUAL_TUTORIALS[featureId];
    if (!steps || steps.length === 0) {
      return;
    }
    mode.value = "contextual";
    activeFeatureId.value = featureId;
    activeSteps.value = steps;
    index.value = 0;
    running.value = true;
  };

  const finish = () => {
    running.value = false;
    if (mode.value === "contextual") {
      const featureId = activeFeatureId.value;
      if (featureId) {
        markFeatureSeen(featureId);
      }
      activeFeatureId.value = null;
    } else {
      markOnboardingSeen();
    }
  };

  const optOut = () => {
    // Record opt-out first so contextual tours can't restart during teardown.
    markOptedOut();
    // Also mark the current tour as resolved so it doesn't replay.
    if (mode.value === "contextual") {
      const featureId = activeFeatureId.value;
      if (featureId) {
        markFeatureSeen(featureId);
      }
    } else {
      markOnboardingSeen();
    }
    running.value = false;
    activeFeatureId.value = null;
  };

  const acceptPrompt = () => {
    promptVisible.value = false;
    start();
  };

  const dismissPrompt = () => {
    promptVisible.value = false;
    // Treat declining as having resolved the onboarding offer so it isn't
    // re-shown on the next load; the tour stays replayable from Settings.
    markOnboardingSeen();
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

  // Offer the tour once for new users, but only once the reader is open to a
  // chapter and visible — no fullscreen pane (e.g. Today) covering it — and
  // (when logged in) after the profile has loaded, otherwise a returning user
  // could see the offer flash before their recorded completion arrives.
  // Rather than launching the tour unannounced we surface the offer card;
  // accepting it starts the tour. One-shot via `autoStartChecked`.
  let autoStartChecked = false;
  effect(() => {
    if (autoStartChecked || running.value) {
      return;
    }
    // Opened via a shared-session invite link: don't auto-launch the onboarding
    // tour over the join. We don't record completion, so the tour still
    // auto-starts on a later visit that isn't a session link.
    if (joinedViaSessionLink) {
      return;
    }
    if (!readerVisible.value) {
      return;
    }
    if (login.userId.value && login.profile.value === null) {
      return;
    }
    autoStartChecked = true;
    if (!completed.value && !optedOut.value) {
      promptVisible.value = true;
    }
  });

  return {
    get steps() {
      return activeSteps.value;
    },
    running,
    index,
    currentStep,
    isLast,
    canGoBack,
    completed,
    optedOut,
    promptVisible,
    featuresSeen,
    start,
    startContextual,
    next,
    prev,
    finish,
    optOut,
    acceptPrompt,
    dismissPrompt,
  };
}
