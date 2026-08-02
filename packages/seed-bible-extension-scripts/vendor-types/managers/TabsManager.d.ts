import { type Signal } from "@preact/signals";
import type { BibleDataManager } from "./BibleDataManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import { createChatsManager, type ChatSession } from "./ChatsManager";
import {
  type BibleReadingState,
  type InitialBibleReadingOptions,
  type TranslationWithLanguage,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { LoginManager } from "../managers/LoginManager";
export declare function formatVerseSelection(
  verseNumbers: number[]
): string | null;
export declare function parseVerseSelection(verse: string): number[];
import type { NavigationManager } from "./NavigationManager";
import type { I18nManager } from "../i18n";
import type { DiscoverManager } from "./DiscoverManager";
import type { BibleReadingExtensionManager } from "./BibleReadingExtensionManager";
export interface ReaderTab {
  /** Unique tab identifier (for example: tab-1, tab-2). */
  id: string;
  /** Display title shown in the tabs UI. */
  title: string;
  /** Independent reading state instance owned by this tab. */
  readingState: BibleReadingState;
  /** Attached shared session, if this tab is backed by collaborative state. */
  sharedSession: BibleReadingSession | null;
  /** Attached shared chat for collaborative tabs. */
  sharedChat: ChatSession | null;
  /**
   * When true, this tab only exists to back a tab slot (e.g. a chapter opened
   * in a new panel) and is hidden from the tab strip. It is disposed
   * automatically once no slot references it. Slots are bound to tabs by id,
   * so such a slot still needs a real tab to own its independent reading
   * state.
   */
  slotOnly?: boolean;
}
export declare const PROFILE_TRANSLATION_ID = "translationId";
export interface InitialTabsOptions {
  translationId: string;
  bookId: string;
  chapter: number;
  highlightedVerses?: number[];
}
export declare function createInitialTabs(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  options: InitialTabsOptions,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): ReaderTab[];
type NewTabSource = BibleReadingState | BibleReadingSession;
/**
 * API surface for creating, selecting, and removing reader tabs.
 *
 * Each tab owns a `BibleReadingState` instance. Tabs can also be backed by a
 * shared reading session, in which case `sharedSession` is set and disposed
 * automatically when the tab is removed.
 */
export interface TabsManager {
  defaultTranslation: TranslationWithLanguage;
  /** Ordered tab list used by the tabs UI. */
  tabs: Signal<ReaderTab[]>;
  /** ID of the currently selected tab. */
  selectedTabId: Signal<string>;
  /**
   * Adds a new tab and selects it.
   *
   * @param source Optional source used to initialize the tab:
   * - `BibleReadingState`: uses an existing reading state instance.
   * - `BibleReadingSession`: uses the session reading state and stores session metadata.
   * - `undefined`: creates a brand new reading state.
   * @param initialReadingOptions Initial translation/book/chapter for the new
   * reading state. Only used when `source` is undefined; ignored when the tab
   * adopts an existing state. Passing this avoids a race where the new tab's
   * `loadInitialData()` defaults to GEN 1 while the caller's follow-up
   * `selectTranslationAndChapter()` is still in flight.
   * @param tabOptions Extra tab metadata. `slotOnly` marks the tab as hidden
   * from the tab strip; it only backs a tab slot and is disposed when
   * unreferenced.
   * @returns The newly created tab.
   */
  addTab: (
    source?: NewTabSource,
    initialReadingOptions?: InitialBibleReadingOptions,
    tabOptions?: {
      slotOnly?: boolean;
    }
  ) => ReaderTab;
  /**
   * Removes a tab by ID.
   *
   * If the tab is associated with a shared session, the session is disposed.
   * If the removed tab was selected, selection falls back to the first tab.
   */
  removeTab: (tabId: string) => void;
  /** Selects a tab by ID. */
  selectTab: (tabId: string) => void;
}
/**
 * Creates the tabs manager and wires configBot synchronization for reading tags.
 *
 * Behavior:
 * - Initializes with a single tab seeded from config tags.
 * - Keeps `configBot` reading tags (`translation`, `book`, `chapter`) in sync
 *   with the selected tab's reading state.
 * - Listens for external `configBot` tag changes and updates selected tab
 *   reading state accordingly.
 */
export declare function createTabs(
  navigation: NavigationManager,
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  chatsManager: ReturnType<typeof createChatsManager>,
  i18nManager: I18nManager,
  login: LoginManager,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): TabsManager;
export {};
