import type { JSX, VNode } from "preact";
import type { ReadonlySignal } from "@preact/signals";
import { type BibleReadingState } from "../managers/BibleReadingManager";
import type { PanesManager } from "../managers/PanesManager";
import type { TabSlot, TabsLayoutManager } from "../managers/TabsLayoutManager";
import { type TabsManager } from "../managers/TabsManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import type { ChatsManager } from "./ChatsManager";
import type { ModalManager } from "./ModalManager";
import type { AppState } from "./SeedBibleStateManager";
import type { ReadingPlansManager } from "../managers/ReadingPlansManager";
import type { PlaylistManager } from "./PlaylistManager";
import { type FeaturesManager } from "./FeaturesManager";
type BibleToolIcon<TContext> = (context: TContext) => JSX.Element | VNode;
type ResolvedBibleToolIcon = () => JSX.Element | VNode;
type ToolPredicateResult = boolean | ReadonlySignal<boolean>;
type ToolPredicate<TContext> = (context: TContext) => ToolPredicateResult;
type ToolPriority<TContext> = number | ((context: TContext) => number);
export type TranslatableTitle =
  | string
  | {
      key: string;
      defaultValue: string;
      ns?: string;
      options?: Record<string, string>;
    };
/**
 * Base tool contract shared by all tool surfaces.
 */
export interface BibleTool<TContext> {
  /** Stable tool identifier used for registration/replacement. */
  id: string;
  /**
   * Sorting priority. Lower values render first.
   *
   * For extensions, this should be between 200 and 999 to appear after default tools, but before the previous chapter button.
   */
  priority: ToolPriority<TContext>;
  /** Localized or plain-text tool title. */
  title: TranslatableTitle;
  /** Icon renderer for the given tool context. */
  icon: BibleToolIcon<TContext>;
}
/**
 * A context-menu item that can be shown for a selected tool.
 *
 * Notes:
 * - Items intentionally do not define priority. Their order is preserved from
 *   the array returned by getItems().
 * - Items cannot define nested getItems() submenus.
 */
export interface ManagedBibleToolItem<TContext> extends Omit<
  BibleTool<TContext>,
  "priority"
> {
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<TContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<TContext>;
  /** Optional action callback for item activation. */
  onSelect?: (context: TContext) => void;
  /** Nested menu items are not supported for context menu entries. */
  getItems?: never;
}
/**
 * Base resolved tool contract returned by tools manager getter methods.
 *
 * Unlike managed/registerable tools, resolved tools have fixed numeric priority
 * and no-arg icon renderers because context has already been applied.
 */
export interface ResolvedBibleTool {
  /** Stable tool identifier used for registration/replacement. */
  id: string;
  /** Resolved sorting priority. Lower values render first. */
  priority: number;
  /** Localized or plain-text tool title. */
  title: TranslatableTitle;
  /** Context-bound icon renderer. */
  icon: ResolvedBibleToolIcon;
}
/** Fully resolved context-menu item ready for rendering. */
export interface ResolvedBibleToolItem extends Omit<
  ResolvedBibleTool,
  "priority"
> {
  /** Disabled state signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility state signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the menu item. */
  onSelect: () => void;
}
/** Window metrics provided to tools when available. */
export interface WindowContext {
  /**
   * Whether the app is currently being rendered in a mobile layout.
   */
  isMobile: boolean;
}
/** Runtime context passed to reader and verse toolbar tools. */
export interface BibleToolContext {
  /** Active reading state for current reader surface. */
  readingState: BibleReadingState;
  /**
   * The current shared bible reading session, if any.
   */
  sharedSession: BibleReadingSession | null;
  /** Bible selector state for opening navigation overlays. */
  selectorState: BibleSelectorState;
  /** Tabs manager for tab-level actions when needed by tools. */
  tabs: TabsManager;
  /** Panes manager for pane-level actions/selection context. */
  panesManager: PanesManager;
  /** Tabs layout manager for slot-level actions/selection context. */
  tabsLayoutManager: TabsLayoutManager;
  /**
   * Chats manager for chat-related actions.
   */
  chats: ChatsManager;
  /** Optional window metrics for responsive tool behavior. */
  window?: WindowContext | null;
  /** Opens the app sidebar (typically for small-screen actions). */
  openSidebar: () => void;
  /** Opens the search interface. */
  openSearch: () => void;
  /** Opens the chat / cross-references floating panel. */
  openChat?: () => void;
  /** Opens the discover panel */
  openDiscover?: () => void;
  /** Shows a transient toast message at the bottom of the screen. */
  toast: (message: string) => void;
  /** Reading plans manager, for opening the plans pane. */
  readingPlans?: ReadingPlansManager;
  /** Playlist manager */
  playlists?: PlaylistManager;
  /** Features manager */
  features: FeaturesManager;
  /** Modals manager */
  modals?: ModalManager;
  /**
   * App-level state. Optional like the other managers above; tools that need
   * shared-session actions (create/share the live session) should guard on it.
   */
  app?: AppState;
}
/** Fully resolved reader toolbar tool ready for rendering. */
export interface BibleReaderToolbarTool extends ResolvedBibleTool {
  isControllable: boolean;
  /** Disabled state signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility state signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
  /**
   * Whether the label for this tool should be hidden.
   * Defaults to false.
   */
  hideLabel?: boolean;
}
export type ManagedBibleToolbarToolItem =
  ManagedBibleToolItem<BibleToolContext>;
/** Registerable reader toolbar tool definition. */
export interface ManagedBibleToolbarTool extends BibleTool<BibleToolContext> {
  /** Whether the tool is controllable by the user. */
  isControllable?: boolean;
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<BibleToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<BibleToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: BibleToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (context: BibleToolContext) => ManagedBibleToolbarToolItem[];
  /**
   * Whether the label for this tool should be hidden.
   * Defaults to false.
   */
  hideLabel?: boolean;
}
/** Fully resolved verse toolbar tool ready for rendering. */
export interface BibleReaderVerseToolbarTool extends ResolvedBibleTool {
  /** Disabled state signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility state signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
}
export type ManagedBibleVerseToolbarToolItem =
  ManagedBibleToolItem<BibleToolContext>;
/** Registerable verse toolbar tool definition. */
export interface ManagedBibleVerseToolbarTool extends BibleTool<BibleToolContext> {
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<BibleToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<BibleToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: BibleToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (context: BibleToolContext) => ManagedBibleVerseToolbarToolItem[];
}
/** Runtime context passed to empty-slot tool surface. */
export interface EmptySlotToolContext {
  /** Bible selector state for opening in empty slots. */
  selectorState: BibleSelectorState;
  /** Slot currently receiving empty-slot actions. */
  currentSlot: TabSlot;
  /** Tabs layout manager for slot-level operations. */
  tabsLayoutManager: TabsLayoutManager;
  /** Tabs manager for cross-tab interactions. */
  tabs: TabsManager;
  /** Optional window metrics for responsive behavior. */
  window?: WindowContext | null;
}
/** Fully resolved empty-slot tool ready for rendering. */
export interface BibleEmptySlotTool extends ResolvedBibleTool {
  /** Disabled signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
}
export type ManagedBibleEmptySlotToolItem =
  ManagedBibleToolItem<EmptySlotToolContext>;
/** Registerable empty-slot tool definition. */
export interface ManagedBibleEmptySlotTool extends BibleTool<EmptySlotToolContext> {
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<EmptySlotToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<EmptySlotToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: EmptySlotToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (context: EmptySlotToolContext) => ManagedBibleEmptySlotToolItem[];
}
/** Fully resolved below-reader tool ready for rendering. */
export interface BibleBelowReaderToolbarTool extends ResolvedBibleTool {
  /** Disabled signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
}
/** Runtime context for below-reader tool surface. */
export interface BibleBelowReaderToolContext extends BibleToolContext {
  /** Slot containing the active reader. */
  currentSlot: TabSlot;
}
/** Registerable below-reader tool definition. */
export interface ManagedBibleBelowReaderToolbarTool extends BibleTool<BibleBelowReaderToolContext> {
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<BibleBelowReaderToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<BibleBelowReaderToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: BibleBelowReaderToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (
    context: BibleBelowReaderToolContext
  ) => ManagedBibleBelowReaderToolbarToolItem[];
}
export type ManagedBibleBelowReaderToolbarToolItem =
  ManagedBibleToolItem<BibleBelowReaderToolContext>;
/**
 * Runtime context for the quick toolbar surface — the compact row of
 * actions shown at the top of the reader, beside the chapter bookmark
 * button. Intentionally lean: quick tools are header-level chapter actions
 * and only need the active reading state.
 */
export interface QuickToolContext {
  /** Active reading state for the current reader surface. */
  readingState: BibleReadingState;
  /**
   * Playlist manager state.
   */
  playlists: PlaylistManager;
  features: FeaturesManager;
  /** Optional window metrics for responsive tool behavior. */
  window?: WindowContext | null;
}
/** Fully resolved quick toolbar tool ready for rendering. */
export interface BibleQuickToolbarTool extends ResolvedBibleTool {
  /** Optional class name for custom styling. */
  className?: string;
  /** Disabled signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
}
export type ManagedBibleQuickToolbarToolItem =
  ManagedBibleToolItem<QuickToolContext>;
/** Registerable quick toolbar tool definition. */
export interface ManagedBibleQuickToolbarTool extends BibleTool<QuickToolContext> {
  /** Optional class name for custom styling. */
  className?: string;
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<QuickToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<QuickToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: QuickToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (context: QuickToolContext) => ManagedBibleQuickToolbarToolItem[];
}
/**
 * Lightweight tool descriptor used for introspection (e.g. settings UI)
 * where we need to list tools without a full rendering context.
 */
export interface ToolMetadata {
  id: string;
  title: TranslatableTitle;
  isControllable?: boolean;
}
/**
 * API surface for registering and resolving tools across all reader toolbars.
 */
export interface ToolsManager {
  /** Registers a reader toolbar tool and returns an unregister callback. */
  registerToolbarTool: (tool: ManagedBibleToolbarTool) => () => void;
  /** Unregisters a reader toolbar tool by ID. */
  unregisterToolbarTool: (toolId: string) => void;
  /** Resolves/sorts reader toolbar tools for the given context. */
  getToolbarTools: (context: BibleToolContext) => BibleReaderToolbarTool[];
  /** Lists reader toolbar tool metadata without resolving any context. */
  listToolbarTools: () => ToolMetadata[];
  /** Registers a verse toolbar tool and returns an unregister callback. */
  registerVerseToolbarTool: (tool: ManagedBibleVerseToolbarTool) => () => void;
  /** Unregisters a verse toolbar tool by ID. */
  unregisterVerseToolbarTool: (toolId: string) => void;
  /** Resolves/sorts verse toolbar tools for the given context. */
  getVerseToolbarTools: (
    context: BibleToolContext
  ) => BibleReaderVerseToolbarTool[];
  /** Lists verse toolbar tool metadata without resolving any context. */
  listVerseToolbarTools: () => ToolMetadata[];
  /** Registers an empty-slot tool and returns an unregister callback. */
  registerEmptySlotTool: (tool: ManagedBibleEmptySlotTool) => () => void;
  /** Unregisters an empty-slot tool by ID. */
  unregisterEmptySlotTool: (toolId: string) => void;
  /** Resolves/sorts empty-slot tools for the given context. */
  getEmptySlotTools: (context: EmptySlotToolContext) => BibleEmptySlotTool[];
  /** Registers a below-reader tool and returns an unregister callback. */
  registerBelowReaderTool: (
    tool: ManagedBibleBelowReaderToolbarTool
  ) => () => void;
  /** Unregisters a below-reader tool by ID. */
  unregisterBelowReaderTool: (toolId: string) => void;
  /** Resolves/sorts below-reader tools for the given context. */
  getBelowReaderTools: (
    context: BibleBelowReaderToolContext
  ) => BibleBelowReaderToolbarTool[];
  /** Registers a quick toolbar tool and returns an unregister callback. */
  registerQuickTool: (tool: ManagedBibleQuickToolbarTool) => () => void;
  /** Unregisters a quick toolbar tool by ID. */
  unregisterQuickTool: (toolId: string) => void;
  /** Resolves/sorts quick toolbar tools for the given context. */
  getQuickTools: (context: QuickToolContext) => BibleQuickToolbarTool[];
  /** Lists quick toolbar tool metadata without resolving any context. */
  listQuickTools: () => ToolMetadata[];
}
/**
 * Generates a sharable URL for the given reading state.
 * @param readingState The Bible reading state to generate the URL from.
 * @returns A URL object representing the sharable link for the current reading state.
 */
export declare function getShareUrl(readingState: BibleReadingState): URL;
/**
 * Formats the selected verses from the reading state into a human-readable string.
 * @param readingState The reading state containing the selected verses to format.
 * @returns A string representing the formatted selected verses.
 */
export declare function formatSelectedVerses(
  readingState: BibleReadingState
): string;
/**
 * Creates the tools manager with default tool sets and registration APIs.
 *
 * Notes:
 * - Registering a tool with an existing ID replaces the previous definition.
 * - Getter methods resolve predicates and priorities for the provided context,
 *   then return tools sorted by ascending priority.
 */
export declare function createBibleToolsManager(): ToolsManager;
export {};
