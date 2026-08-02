import { type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import type { PanesManager } from "../managers/PanesManager";
import { createSidebar } from "../managers/SidebarManager";
type SidebarManager = ReturnType<typeof createSidebar>;
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
export declare const ONBOARDING_STEPS: TutorialStep[];
/**
 * Back-compat alias. Some callers (settings page replay, mobile tour
 * fallbacks) still reference TUTORIAL_STEPS by name.
 */
export declare const TUTORIAL_STEPS: TutorialStep[];
/**
 * The mobile tour. Below 480px the desktop selector sub-controls (translation,
 * testament) and the pane-layout menu aren't rendered, so mobile gets its own
 * step list targeting the mobile header, the book selector grid, and the
 * bottom toolbar. The book step reuses the `selector-books` id so the
 * selector's built-in spotlight/open logic applies.
 */
export declare const MOBILE_TUTORIAL_STEPS: TutorialStep[];
/**
 * Contextual single-feature tutorials. Triggered the first time the user
 * actually uses the feature (e.g. clicks the panels button), so we don't
 * front-load advanced UI in the first-run experience. Each feature gets its
 * own seen-flag so a completed/skipped contextual tour never reappears.
 */
export declare const CONTEXTUAL_TUTORIALS: Record<string, TutorialStep[]>;
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
export declare function createTutorialManager(
  login: LoginManager,
  readerVisible: ReadonlySignal<boolean>,
  selector: BibleSelectorState,
  isMobile: ReadonlySignal<boolean>,
  panes: PanesManager,
  sidebar: SidebarManager,
  joinedViaSessionLink?: boolean
): TutorialManager;
export {};
