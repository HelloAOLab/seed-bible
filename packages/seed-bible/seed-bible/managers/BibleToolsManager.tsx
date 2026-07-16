import { MaterialIcon, SeedBibleIcon, StopIcon } from "../components/icons";
import type { JSX, VNode } from "preact";
import { computed, signal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import {
  DEFAULT_BOOK_ID,
  type BibleReadingState,
} from "../managers/BibleReadingManager";
import type { PanesManager } from "../managers/PanesManager";
import type { TabSlot, TabsLayoutManager } from "../managers/TabsLayoutManager";
import {
  formatVerseSelection,
  type TabsManager,
} from "../managers/TabsManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import { sortBy } from "es-toolkit";
import type { BibleReadingSession } from "../managers/SessionsManager";
import type { ChatsManager } from "./ChatsManager";
import type { ReadingPlansManager } from "../managers/ReadingPlansManager";
import { ReadingPlansPane } from "../components/ReadingPlansPane/ReadingPlansPane";
import type { PlaylistManager } from "./PlaylistManager";
import { useI18n } from "../i18n";
import {
  FEATURE_KEY_READING_PLANS,
  type FeaturesManager,
} from "./FeaturesManager";
import { playlistItemLabel } from "../components/playlistItemLabel";

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

function validateToolActions(
  tool:
    | ManagedBibleToolbarTool
    | ManagedBibleVerseToolbarTool
    | ManagedBibleEmptySlotTool
    | ManagedBibleBelowReaderToolbarTool
    | ManagedBibleQuickToolbarTool
) {
  if (tool.onSelect && tool.getItems) {
    throw new Error(
      `Tool \"${tool.id}\" cannot define both onSelect() and getItems().`
    );
  }
}

function resolveToolItems<TContext>(
  getItems:
    | ((context: TContext) => ManagedBibleToolItem<TContext>[])
    | undefined,
  context: TContext,
  parentToolId: string
) {
  if (!getItems) {
    return undefined;
  }

  return () =>
    getItems(context).map((item) => {
      const maybeNestedItems = item as ManagedBibleToolItem<TContext> & {
        getItems?: unknown;
      };
      if (maybeNestedItems.getItems) {
        throw new Error(
          `Tool item \"${item.id}\" in \"${parentToolId}\" cannot define getItems().`
        );
      }

      return {
        id: item.id,
        title: item.title,
        icon: () => item.icon(context),
        disabled: resolveToolPredicate(item.isDisabled, context, false),
        visible: resolveToolPredicate(item.isVisible, context, true),
        onSelect: () => item.onSelect?.(context),
      };
    });
}

function resolveToolPredicate<TContext>(
  predicate: ToolPredicate<TContext> | undefined,
  context: TContext,
  defaultValue: boolean
): ReadonlySignal<boolean> {
  const result = predicate?.(context);

  if (typeof result === "undefined") {
    return computed(() => defaultValue);
  }

  if (typeof result === "boolean") {
    return computed(() => result);
  }

  return result;
}

function resolveToolPriority<TContext>(
  priority: ToolPriority<TContext>,
  context: TContext
): number {
  if (typeof priority === "number") {
    return priority;
  }

  return priority(context);
}

function MenuIcon() {
  return <MaterialIcon>menu</MaterialIcon>;
}

function ChevronLeftIcon() {
  return <MaterialIcon>chevron_left</MaterialIcon>;
}

function OpenSelectorIcon() {
  return <SeedBibleIcon size={28} className="sb-open-selector-icon" />;
}

function ChevronRightIcon() {
  return <MaterialIcon>chevron_right</MaterialIcon>;
}

function NextItemIcon() {
  return <MaterialIcon>skip_next</MaterialIcon>;
}

function PreviousItemIcon() {
  return <MaterialIcon>skip_previous</MaterialIcon>;
}

function CopyVerseIcon() {
  return <MaterialIcon>content_copy</MaterialIcon>;
}

function ShareVerseIcon() {
  return <MaterialIcon>share</MaterialIcon>;
}

function ClearSelectionIcon() {
  return <MaterialIcon>clear</MaterialIcon>;
}

function OpenInSelectorIcon() {
  return <MaterialIcon>menu_book</MaterialIcon>;
}

function getDefaultEmptySlotToolbarTools(): ManagedBibleEmptySlotTool[] {
  return [
    {
      id: "open-in-selector",
      priority: 0,
      title: { key: "books", defaultValue: "Books" },
      icon: OpenInSelectorIcon,
      onSelect: (context) => {
        context.selectorState.setOpen(true, context.currentSlot);
      },
    },
  ];
}

function getDefaultBelowReaderToolbarTools(): ManagedBibleBelowReaderToolbarTool[] {
  return [
    {
      id: "powered-by",
      priority: 0,
      title: "Powered by Seed Bible API",
      icon: () => (
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <SeedBibleIcon />
        </span>
      ),
      isDisabled: () => true,
      onSelect: () => {},
    },
  ];
}

function NowPlayingIcon({
  playlists,
  readingState,
}: {
  playlists: PlaylistManager;
  readingState: BibleReadingState;
}) {
  const { t } = useI18n();
  const currentlyPlaying = playlists.playing.value;
  if (!currentlyPlaying) return null;
  const currentPlaylist = currentlyPlaying.playlists.value[0];
  const currentItem = currentlyPlaying.currentItem.value;

  const books = readingState.translationBooks.value;
  const resolveBookName = (bookId: string): string => {
    const book = books?.books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const title =
    currentPlaylist?.title ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });
  return (
    <span className="sb-now-playing-icon">
      <h4 className="sb-now-playing-icon-title">{title}</h4>
      {currentItem && (
        <span>{playlistItemLabel(currentItem, t, resolveBookName)}</span>
      )}
    </span>
  );
}

function getDefaultQuickToolbarTools(): ManagedBibleQuickToolbarTool[] {
  return [
    {
      id: "current-playlist",
      priority: 0,
      title: {
        key: "current-playlist",
        defaultValue: "Current Playlist",
      },
      className: "sb-quick-toolbar-current-playlist",
      icon: (c) => (
        <NowPlayingIcon playlists={c.playlists} readingState={c.readingState} />
      ),
      isVisible: (c) =>
        !!c.playlists.playing.value?.playlists.value.length &&
        c.playlists.isMobile.value,
      onSelect: (c) => {
        c.playlists.view.value = "play_playlist";
      },
    },
  ];
}

function getDefaultToolbarTools(): ManagedBibleToolbarTool[] {
  return [
    {
      id: "stop-playing",
      priority: -1,
      hideLabel: true,
      title: { key: "stop", defaultValue: "Stop" },
      icon: () => <StopIcon />,
      isVisible: (context) => !!context.playlists?.playing?.value,
      onSelect: (context) => {
        context.playlists?.stopPlaying();
      },
      isControllable: false,
    },
    {
      id: "previous-chapter",
      priority: 0,
      hideLabel: true,
      title: { key: "previous-chapter", defaultValue: "Previous Chapter" },
      icon: (context) =>
        context.readingState.translation.value?.textDirection === "rtl" ? (
          <ChevronRightIcon />
        ) : (
          <ChevronLeftIcon />
        ),
      isDisabled: (context) =>
        !context.readingState.hasPrevious.value ||
        context.readingState.loading.value,
      isVisible: (context) => !context.playlists?.playing?.value,
      onSelect: (context) => {
        context.readingState.loadPreviousChapter();
      },
      isControllable: false,
    },
    {
      id: "previous-item",
      priority: 0,
      hideLabel: true,
      title: { key: "previous", defaultValue: "Previous" },
      icon: (context) =>
        context.readingState.translation.value?.textDirection === "rtl" ? (
          <NextItemIcon />
        ) : (
          <PreviousItemIcon />
        ),
      isDisabled: (context) =>
        !context.playlists?.playing?.value?.hasPrevious.value,
      isVisible: (context) => !!context.playlists?.playing?.value,
      onSelect: (context) => {
        context.playlists?.playing.value?.previous();
      },
      isControllable: false,
    },
    {
      id: "open-sidebar",
      priority: 50,
      title: { key: "side-menu", defaultValue: "Side menu" },
      icon: MenuIcon,
      isVisible: (context) =>
        !!context.openSidebar && (context.window?.isMobile ?? false),
      onSelect: (context) => {
        context.openSidebar?.();
      },
      isControllable: false,
    },
    {
      id: "open-selector",
      priority: 100,
      title: { key: "books", defaultValue: "Books" },
      icon: OpenSelectorIcon,
      isDisabled: (context) => context.readingState.loading.value,
      onSelect: (context) => {
        const currentSlot =
          context.tabsLayoutManager.slots.value.find(
            (slot) => slot.id === context.tabsLayoutManager.selectedSlotId.value
          ) ?? null;
        if (!currentSlot) {
          return;
        }

        context.selectorState.setOpen(true, currentSlot);
      },
      isControllable: false,
    },
    {
      id: "open-search",
      priority: 110,
      title: { key: "search", defaultValue: "Search" },
      icon: () => <MaterialIcon>search</MaterialIcon>,
      onSelect: (context) => {
        context.openSearch();
      },
    },
    {
      id: "open-chat",
      priority: 120,
      title: { key: "chat", defaultValue: "Chat" },
      icon: () => <MaterialIcon>chat_bubble_outline</MaterialIcon>,
      isVisible: (context) => {
        // Hide when there are no providers and no chats
        return (
          context.chats.providers.value.length > 0 ||
          context.chats.chats.value.length > 0
        );
      },
      onSelect: (context) => {
        context.openChat?.();
      },
    },
    {
      id: "open-plans",
      priority: 115,
      title: { key: "plans", defaultValue: "Plans" },
      icon: () => <MaterialIcon>menu_book</MaterialIcon>,
      isVisible: (context) =>
        !!context.readingPlans &&
        context.features.isFeatureEnabled(FEATURE_KEY_READING_PLANS),
      onSelect: (context) => {
        const readingPlans = context.readingPlans;
        if (!readingPlans) {
          return;
        }
        context.panesManager.openPane({
          id: "reading-plans-pane",
          placement: "side",

          // TODO: Translate this title
          title: "Reading Plans",
          component: () => <ReadingPlansPane readingPlans={readingPlans} />,
        });
      },
    },
    {
      id: "open-discover",
      priority: 120,
      title: { key: "discover", defaultValue: "Discover" },
      icon: () => <MaterialIcon>explore</MaterialIcon>,
      isVisible: (context) => !!context.openDiscover,
      onSelect: (context) => {
        if (!context.openDiscover) {
          return;
        }
        context.openDiscover();
      },
    },
    {
      id: "next-chapter",
      priority: 1000,
      hideLabel: true,
      title: { key: "next-chapter", defaultValue: "Next Chapter" },
      icon: (context) =>
        context.readingState.translation.value?.textDirection === "rtl" ? (
          <ChevronLeftIcon />
        ) : (
          <ChevronRightIcon />
        ),
      isDisabled: (context) =>
        !context.readingState.hasNext.value ||
        context.readingState.loading.value,
      isVisible: (context) => !context.playlists?.playing?.value,
      onSelect: (context) => {
        context.readingState.loadNextChapter();
      },
      isControllable: false,
    },
    {
      id: "next-item",
      priority: 1000,
      hideLabel: true,
      title: { key: "next", defaultValue: "Next" },
      icon: (context) =>
        context.readingState.translation.value?.textDirection === "rtl" ? (
          <PreviousItemIcon />
        ) : (
          <NextItemIcon />
        ),
      isDisabled: (context) =>
        !context.playlists?.playing?.value?.hasNext.value,
      isVisible: (context) => !!context.playlists?.playing?.value,
      onSelect: (context) => {
        context.playlists?.playing.value?.next();
      },
      isControllable: false,
    },
  ];
}

function getDefaultVerseToolbarTools(): ManagedBibleVerseToolbarTool[] {
  return [
    {
      id: "add-to-playlist",
      priority: 100,
      title: { key: "add-to-playlist", defaultValue: "Add to Playlist" },
      icon: () => <MaterialIcon>playlist_add</MaterialIcon>,
      isVisible: (context) => !!context.playlists?.editingPlaylist.value,
      onSelect: async (context) => {
        const playlist = context.playlists?.editingPlaylist.value;
        if (!playlist) return;

        context.playlists!.editingPlaylist.value = {
          ...playlist,
          items: [
            ...playlist.items,
            ...context.readingState.selectedVerses.value.map((verse) => ({
              type: "bible-verse" as const,
              ref: {
                bookId: verse.bookId,
                chapter: verse.chapterNumber,
                verse: verse.verse.number,
              },
            })),
          ],
        };

        context.readingState.clearSelectedVerses();
      },
    },
    {
      id: "copy-verse",
      priority: 200,
      title: { key: "copy-verse", defaultValue: "Copy" },
      icon: CopyVerseIcon,
      isVisible: (context) =>
        context.readingState.selectedVerses.value.length > 0,
      onSelect: async (context) => {
        if (context.readingState.selectedVerses.value.length === 0) return;

        const verseTexts = formatSelectedVerses(context.readingState);

        try {
          navigator.clipboard.writeText(verseTexts);
          context.toast("Copied!");
        } catch (err) {
          console.error("Failed to copy verse:", err);
        }
      },
    },
    {
      id: "share-verse",
      priority: 300,
      title: { key: "share-verse", defaultValue: "Share" },
      icon: ShareVerseIcon,
      isVisible: (context) =>
        context.readingState.selectedVerses.value.length > 0,
      onSelect: (context) => {
        if (context.readingState.selectedVerses.value.length === 0) return;

        let verseTexts = formatSelectedVerses(context.readingState);

        const url = getShareUrl(context.readingState);

        verseTexts += `\n\n${url.toString()}`;

        navigator.share({
          title:
            "Bible Verse" +
            (context.readingState.selectedVerses.value.length > 1 ? "s" : ""),
          text: verseTexts,
        });
      },
    },
    {
      id: "clear-selection",
      priority: 400,
      title: { key: "cancel", defaultValue: "Cancel" },
      icon: ClearSelectionIcon,
      isVisible: (context) =>
        context.readingState.selectedVerses.value.length > 0,
      onSelect: (context) => {
        context.readingState.clearSelectedVerses();
      },
    },
  ];
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
export function getShareUrl(readingState: BibleReadingState) {
  const url = new URL(window.location.href);
  url.search = "";
  // if (configBot.tags.pattern) {
  //   url.searchParams.set("pattern", configBot.tags.pattern);
  // }
  const translation =
    readingState.translation.value?.id ?? readingState.defaultTranslation.id;
  const bookId = readingState.bookId.value ?? DEFAULT_BOOK_ID;
  url.searchParams.set("translation", translation);
  url.searchParams.set("book", bookId);

  if (readingState.selectedVerses.value.length > 0) {
    const verses = readingState.selectedVerses.value
      .filter((v) => v.bookId === bookId && v.translationId === translation)
      .map((v) => v.verse.number);
    if (verses.length > 0) {
      const formatted = formatVerseSelection(verses);
      if (formatted) {
        url.search += `&verse=${formatted}`;
      }
    }
  }
  return url;
}

/**
 * Formats the selected verses from the reading state into a human-readable string.
 * @param readingState The reading state containing the selected verses to format.
 * @returns A string representing the formatted selected verses.
 */
function formatSelectedVerses(readingState: BibleReadingState) {
  return readingState.selectedVerses.value
    .map((verse) => {
      const verseReference = `${verse.bookId} ${verse.chapterNumber}:${verse.verse.number}`;
      return `${verse.verse.content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part)
            return (part as { text: string }).text;
          return "";
        })
        .join("")} (${verseReference})`;
    })
    .join("\n\n");
}

/**
 * Creates the tools manager with default tool sets and registration APIs.
 *
 * Notes:
 * - Registering a tool with an existing ID replaces the previous definition.
 * - Getter methods resolve predicates and priorities for the provided context,
 *   then return tools sorted by ascending priority.
 */
export function createBibleToolsManager(): ToolsManager {
  const toolbarTools = signal<ManagedBibleToolbarTool[]>(
    getDefaultToolbarTools()
  );
  const verseToolbarTools = signal<ManagedBibleVerseToolbarTool[]>(
    getDefaultVerseToolbarTools()
  );
  const emptySlotTools = signal<ManagedBibleEmptySlotTool[]>(
    getDefaultEmptySlotToolbarTools()
  );
  const belowReaderTools = signal<ManagedBibleBelowReaderToolbarTool[]>(
    getDefaultBelowReaderToolbarTools()
  );
  const quickTools = signal<ManagedBibleQuickToolbarTool[]>(
    getDefaultQuickToolbarTools()
  );

  const registerToolbarTool = (tool: ManagedBibleToolbarTool) => {
    validateToolActions(tool);
    const nextTools = toolbarTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    toolbarTools.value = [...nextTools, tool];

    return () => {
      unregisterToolbarTool(tool.id);
    };
  };

  const unregisterToolbarTool = (toolId: string) => {
    toolbarTools.value = toolbarTools.value.filter(
      (tool) => tool.id !== toolId
    );
  };

  const getToolbarTools = (context: BibleToolContext) => {
    const tools = toolbarTools.value.map((tool) => ({
      id: tool.id,
      priority: resolveToolPriority(tool.priority, context),
      title: tool.title,
      icon: () => tool.icon(context),
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
      getItems: resolveToolItems(tool.getItems, context, tool.id),
      isControllable: tool.isControllable ?? true,
      hideLabel: tool.hideLabel ?? false,
    }));

    return sortBy(tools, [(tool) => tool.priority]);
  };

  const listToolbarTools = (): ToolMetadata[] =>
    toolbarTools.value.map((tool) => ({
      id: tool.id,
      title: tool.title,
      isControllable: tool.isControllable ?? true,
    }));

  const registerVerseToolbarTool = (tool: ManagedBibleVerseToolbarTool) => {
    validateToolActions(tool);
    const nextTools = verseToolbarTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    verseToolbarTools.value = [...nextTools, tool];

    return () => {
      unregisterVerseToolbarTool(tool.id);
    };
  };

  const unregisterVerseToolbarTool = (toolId: string) => {
    verseToolbarTools.value = verseToolbarTools.value.filter(
      (tool) => tool.id !== toolId
    );
  };

  const getVerseToolbarTools = (context: BibleToolContext) => {
    const tools = verseToolbarTools.value.map((tool) => ({
      id: tool.id,
      priority: resolveToolPriority(tool.priority, context),
      title: tool.title,
      icon: () => tool.icon(context),
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
      getItems: resolveToolItems(tool.getItems, context, tool.id),
    }));

    return sortBy(tools, [(tool) => tool.priority]);
  };

  const listVerseToolbarTools = (): ToolMetadata[] =>
    verseToolbarTools.value.map((tool) => ({ id: tool.id, title: tool.title }));

  const registerEmptySlotTool = (tool: ManagedBibleEmptySlotTool) => {
    validateToolActions(tool);
    const nextTools = emptySlotTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    emptySlotTools.value = [...nextTools, tool];

    return () => {
      unregisterEmptySlotTool(tool.id);
    };
  };

  const unregisterEmptySlotTool = (toolId: string) => {
    emptySlotTools.value = emptySlotTools.value.filter(
      (tool) => tool.id !== toolId
    );
  };

  const getEmptySlotTools = (context: EmptySlotToolContext) => {
    const tools = emptySlotTools.value.map((tool) => ({
      id: tool.id,
      priority: resolveToolPriority(tool.priority, context),
      title: tool.title,
      icon: () => tool.icon(context),
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
      getItems: resolveToolItems(tool.getItems, context, tool.id),
    }));

    return sortBy(tools, [(tool) => tool.priority]);
  };

  const registerBelowReaderTool = (
    tool: ManagedBibleBelowReaderToolbarTool
  ) => {
    validateToolActions(tool);
    const nextTools = belowReaderTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    belowReaderTools.value = [...nextTools, tool];

    return () => {
      unregisterBelowReaderTool(tool.id);
    };
  };

  const unregisterBelowReaderTool = (toolId: string) => {
    belowReaderTools.value = belowReaderTools.value.filter(
      (tool) => tool.id !== toolId
    );
  };

  const getBelowReaderTools = (context: BibleBelowReaderToolContext) => {
    const tools = belowReaderTools.value.map((tool) => ({
      id: tool.id,
      priority: resolveToolPriority(tool.priority, context),
      title: tool.title,
      icon: () => tool.icon(context),
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
      getItems: resolveToolItems(tool.getItems, context, tool.id),
    }));

    return sortBy(tools, [(tool) => tool.priority]);
  };

  const registerQuickTool = (tool: ManagedBibleQuickToolbarTool) => {
    validateToolActions(tool);
    const nextTools = quickTools.value.filter((entry) => entry.id !== tool.id);
    quickTools.value = [...nextTools, tool];

    return () => {
      unregisterQuickTool(tool.id);
    };
  };

  const unregisterQuickTool = (toolId: string) => {
    quickTools.value = quickTools.value.filter((tool) => tool.id !== toolId);
  };

  const getQuickTools = (context: QuickToolContext) => {
    const tools = quickTools.value.map((tool) => ({
      id: tool.id,
      priority: resolveToolPriority(tool.priority, context),
      title: tool.title,
      icon: () => tool.icon(context),
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
      getItems: resolveToolItems(tool.getItems, context, tool.id),
      className: tool.className,
    }));

    return sortBy(tools, [(tool) => tool.priority]);
  };

  const listQuickTools = (): ToolMetadata[] =>
    quickTools.value.map((tool) => ({ id: tool.id, title: tool.title }));

  return {
    registerToolbarTool,
    unregisterToolbarTool,
    getToolbarTools,
    listToolbarTools,
    registerVerseToolbarTool,
    unregisterVerseToolbarTool,
    getVerseToolbarTools,
    listVerseToolbarTools,
    registerEmptySlotTool,
    unregisterEmptySlotTool,
    getEmptySlotTools,
    registerBelowReaderTool,
    unregisterBelowReaderTool,
    getBelowReaderTools,
    registerQuickTool,
    unregisterQuickTool,
    getQuickTools,
    listQuickTools,
  };
}
