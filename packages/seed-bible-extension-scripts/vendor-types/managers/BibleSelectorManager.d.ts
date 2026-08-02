import type {
  Translation,
  TranslationBook,
  TranslationBooks,
} from "../managers/FreeUseBibleAPI";
import type { BibleDataManager } from "../managers/BibleDataManager";
import { type BibleReadingState } from "../managers/BibleReadingManager";
import type { TabSlot, TabsLayoutManager } from "../managers/TabsLayoutManager";
import { type TabsManager } from "../managers/TabsManager";
import type { LoginManager } from "../managers/LoginManager";
import type {
  BookOrientation,
  SettingsManager,
} from "../managers/SettingsManager";
import { createSidebar } from "../managers/SidebarManager";
import type { NavigationManager } from "../managers/NavigationManager";
import { type BookmarksManager } from "../managers/BookmarksManager";
import { Signal, type ReadonlySignal } from "@preact/signals";
type SidebarManager = ReturnType<typeof createSidebar>;
/** Optional options used when opening the selector. */
export interface BibleSelectorOptions {
  /** Slot context to bind selector actions to. */
  slot?: TabSlot;
}
/** Options passed to `setOpen` to control selector behavior on open. */
export interface BibleSelectorSetOpenOptions {
  /**
   * When true, the next chapter selection always creates a new tab and binds
   * it to the target slot, even if the slot already has a tab.
   * Cleared automatically when the selector closes.
   */
  forNewTab?: boolean;
}
export interface GhostBook {
  ghost?: boolean;
}
export interface TranslationLanguageGroup {
  language: string;
  languageEnglishName: string;
  languageName: string;
  translations: Translation[];
}
export type BibleSelectorBookItem = TranslationBook | GhostBook;
export type BibleSelectorPsalmsGroups =
  | "1-psalms"
  | "2-psalms"
  | "3-psalms"
  | "4-psalms"
  | "5-psalms";
/**
 * Reactive state + actions for the Bible selector overlay.
 *
 * The selector is slot-aware: chapter selections are applied to the bound
 * slot (or a new tab may be created if the slot has no tab content yet).
 */
export interface BibleSelectorState {
  /** Whether the selector overlay is currently open. */
  isOpen: Signal<boolean>;
  /** Slot currently targeted by selector actions. */
  slot: Signal<TabSlot | null>;
  /** Reading state for the active slot (null when slot has no tab). */
  readingState: ReadonlySignal<BibleReadingState | null>;
  /** Active slot translation ID snapshot. */
  currentTranslationId: ReadonlySignal<string | null>;
  /** Active slot book ID snapshot. */
  currentBookId: ReadonlySignal<string | null>;
  /** Active slot chapter number snapshot. */
  currentChapterNumber: ReadonlySignal<number | null>;
  /** Current book-arrangement orientation (used for section labelling). */
  orientation: ReadonlySignal<BookOrientation>;
  /** Available translations loaded by the data manager. */
  availableTranslations: ReadonlySignal<Translation[]>;
  /** True while selector is loading translation/book data. */
  loading: Signal<boolean>;
  /** Last selector error message, if any. */
  error: Signal<string | null>;
  /** Translation currently selected in the selector UI. */
  selectedTranslationId: Signal<string | null>;
  /** Translation metadata for `selectedTranslationId`. */
  selectedTranslation: Signal<Translation | null>;
  /** Expanded book ID in selector accordions/lists. */
  expandedBookId: Signal<string | null>;
  /** Loaded book metadata for selected translation. */
  selectedTranslationBooks: Signal<TranslationBooks | null>;
  groupedBooks: ReadonlySignal<{
    oldTestament: TranslationBook[];
    newTestament: TranslationBook[];
    apocrypha: TranslationBook[];
  }>;
  search: Signal<string>;
  /**
   * True while the selector is in "create a new tab" mode — chapter
   * selections create a brand new tab and bind it to the target slot
   * instead of reusing the slot's existing tab.
   */
  forceNewTab: Signal<boolean>;
  /** All slots available as targets for the selector. */
  availableSlots: ReadonlySignal<TabSlot[]>;
  /**
   * Opens/closes selector.
   * When opening, optionally rebinds selector to a slot and synchronizes data.
   */
  setOpen: (
    open: boolean,
    slot?: TabSlot,
    options?: BibleSelectorSetOpenOptions
  ) => Promise<void>;
  /** Switches the target slot while the selector is open. */
  setTargetSlot: (slotId: string) => void;
  /** Sets the current selector search query. */
  setSearch: (value: string) => void;
  /** Toggles expanded state for a given book ID. */
  setExpandedBook: (bookId: string) => void;
  /** Loads books for a selected translation in selector UI. */
  selectTranslation: (translationId: string) => Promise<void>;
  /**
   * Explicit user pick from the translation list in the selector UI. Behaves
   * like `selectTranslation`, but also persists the choice to the user's
   * profile so it's restored the next time they open the app. Programmatic
   * translation changes (selector sync on open, language-driven translation
   * switch, custom translation URL addition) should keep using
   * `selectTranslation` instead, since those aren't a deliberate pick from
   * the list.
   */
  pickTranslation: (translationId: string) => Promise<void>;
  /**
   * Applies chapter selection to the bound slot/tab and closes selector.
   * Creates a new tab if needed when the bound slot has no tab content,
   * or when `forceNewTab` is true.
   */
  selectChapter: (bookId: string, chapterNumber: number) => void;
  selectedTestament: Signal<number>;
  apocryphaAvailable: Signal<boolean>;
  selectingTranslation: Signal<boolean>;
  lastBookClicked: Signal<number>;
  bookData: Signal<TranslationBook | null>;
  chT: Signal<number>;
  localSelectedTestament: Signal<number>;
  highLightedButtonsID: Signal<Record<number, boolean>>;
  currentPsalms: Signal<BibleSelectorPsalmsGroups[]>;
  selectedTestamentData: Signal<TranslationBook[] | null>;
  handleChapterClick: (props: { book: TranslationBook }) => void;
  calcChapterPos: (index: number, separator: number) => number;
  isBook: (book: BibleSelectorBookItem) => book is TranslationBook;
  ghostArray: (
    booksArray: TranslationBook[],
    allowedRows: number
  ) => BibleSelectorBookItem[];
  handleEnter: () => void;
  languageQuery: Signal<string>;
  showCustomTranslation: Signal<boolean>;
  allowedTranslationLimit: Signal<number>;
  apiTranslations: ReadonlySignal<TranslationLanguageGroup[]>;
  showAllLanguages: Signal<"complete" | "all" | "popular">;
  showTranslationSettings: Signal<boolean>;
  showTranslationInfo: Signal<{
    translation: Translation;
    position: {
      x: number;
      y: number;
    };
  } | null>;
  /**
   * The translation whose offline download the user is being asked to confirm
   * removing, or null when no confirmation is pending.
   */
  pendingOfflineDelete: Signal<Translation | null>;
  inputValue: Signal<string>;
  filteredApiTranslations: ReadonlySignal<TranslationLanguageGroup[]>;
  handleTranslationAddition: () => void;
  openTabs: () => void;
  bookmarks: BookmarksManager;
  showApocryphaInfo: Signal<boolean>;
}
/**
 * Creates the Bible selector manager.
 *
 * Behavior summary:
 * - Maintains selector open/close state and slot binding.
 * - Synchronizes selector translation/book context from active slot reading state.
 * - Mirrors open/close state to the `?selector=open` URL param via the
 *   NavigationManager, giving back-button / shareable-URL support.
 * - Computes responsive Old/New Testament rows based on viewport width.
 * - Routes chapter selection into the bound slot/tab reading state.
 */
export declare function createBibleSelectorState(
  dataManager: BibleDataManager,
  tabsManager: TabsManager,
  tabsLayoutManager: TabsLayoutManager,
  settings: SettingsManager,
  sidebar: SidebarManager,
  bookmarks: BookmarksManager,
  navigation: NavigationManager,
  login: LoginManager
): BibleSelectorState;
export {};
