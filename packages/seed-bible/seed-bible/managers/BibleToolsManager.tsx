import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import type { JSX, VNode } from "preact";
import { computed, signal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import { sortBy } from "es-toolkit";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";

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
  /** Current viewport width signal. */
  innerWidth: ReadonlySignal<number>;
  /** Current viewport height signal. */
  innerHeight: ReadonlySignal<number>;
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
  /** Optional window metrics for responsive tool behavior. */
  window?: WindowContext | null;
  /** Opens the app sidebar (typically for small-screen actions). */
  openSidebar: () => void;
  /** Opens the search interface. */
  openSearch: () => void;
  /** Opens the chat / cross-references floating panel. */
  openChat?: () => void;
}

/** Fully resolved reader toolbar tool ready for rendering. */
export interface BibleReaderToolbarTool extends ResolvedBibleTool {
  /** Disabled state signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility state signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
}

export type ManagedBibleToolbarToolItem =
  ManagedBibleToolItem<BibleToolContext>;

/** Registerable reader toolbar tool definition. */
export interface ManagedBibleToolbarTool extends BibleTool<BibleToolContext> {
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<BibleToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<BibleToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: BibleToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (context: BibleToolContext) => ManagedBibleToolbarToolItem[];
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

/** Runtime context passed to empty-pane tool surface. */
export interface EmptyPaneToolContext {
  /** Bible selector state for opening in empty panes. */
  selectorState: BibleSelectorState;
  /** Pane currently receiving empty-pane actions. */
  currentPane: Pane;
  /** Panes manager for pane-level operations. */
  panesManager: PanesManager;
  /** Tabs manager for cross-tab interactions. */
  tabs: TabsManager;
  /** Optional window metrics for responsive behavior. */
  window?: WindowContext | null;
}

/** Fully resolved empty-pane tool ready for rendering. */
export interface BibleEmptyPaneTool extends ResolvedBibleTool {
  /** Disabled signal resolved for current context. */
  disabled: ReadonlySignal<boolean>;
  /** Visibility signal resolved for current context. */
  visible: ReadonlySignal<boolean>;
  /** Invoked when the user activates the tool. */
  onSelect: () => void;
  /** Optional context-menu items for this tool. */
  getItems?: () => ResolvedBibleToolItem[];
}

export type ManagedBibleEmptyPaneToolItem =
  ManagedBibleToolItem<EmptyPaneToolContext>;

/** Registerable empty-pane tool definition. */
export interface ManagedBibleEmptyPaneTool extends BibleTool<EmptyPaneToolContext> {
  /** Optional disabled predicate (boolean or signal). */
  isDisabled?: ToolPredicate<EmptyPaneToolContext>;
  /** Optional visibility predicate (boolean or signal). */
  isVisible?: ToolPredicate<EmptyPaneToolContext>;
  /** Optional action callback for tool activation. Mutually exclusive with getItems(). */
  onSelect?: (context: EmptyPaneToolContext) => void;
  /** Optional context-menu items resolver. Mutually exclusive with onSelect(). */
  getItems?: (context: EmptyPaneToolContext) => ManagedBibleEmptyPaneToolItem[];
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
  /** Pane containing the active reader. */
  currentPane: Pane;
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

function validateToolActions(
  tool:
    | ManagedBibleToolbarTool
    | ManagedBibleVerseToolbarTool
    | ManagedBibleEmptyPaneTool
    | ManagedBibleBelowReaderToolbarTool
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

function getDefaultEmptyPaneToolbarTools(): ManagedBibleEmptyPaneTool[] {
  return [
    {
      id: "open-in-selector",
      priority: 0,
      title: { key: "books", defaultValue: "Books" },
      icon: OpenInSelectorIcon,
      onSelect: (context) => {
        context.selectorState.setOpen(true, context.currentPane);
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

function getDefaultToolbarTools(): ManagedBibleToolbarTool[] {
  return [
    {
      id: "previous-chapter",
      priority: 0,
      title: { key: "previous-chapter", defaultValue: "Previous Chapter" },
      icon: (context) =>
        context.readingState.translation.value?.textDirection === "rtl" ? (
          <ChevronRightIcon />
        ) : (
          <ChevronLeftIcon />
        ),
      isDisabled: (context) =>
        !context.readingState.chapterData.value?.previousChapterApiLink ||
        context.readingState.loading.value,
      onSelect: (context) => {
        context.readingState.loadPreviousChapter();
      },
    },
    {
      id: "open-sidebar",
      priority: 50,
      title: { key: "side-menu", defaultValue: "Side menu" },
      icon: MenuIcon,
      isVisible: (context) =>
        !!context.openSidebar &&
        typeof context.window?.innerWidth.value === "number" &&
        context.window?.innerWidth.value <= 768,
      onSelect: (context) => {
        context.openSidebar?.();
      },
    },
    {
      id: "open-selector",
      priority: 100,
      title: { key: "books", defaultValue: "Books" },
      icon: OpenSelectorIcon,
      isDisabled: (context) => context.readingState.loading.value,
      onSelect: (context) => {
        const currentPane =
          context.panesManager.panes.value.find(
            (pane) => pane.id === context.panesManager.selectedPaneId.value
          ) ?? null;
        if (!currentPane) {
          return;
        }

        context.selectorState.setOpen(true, currentPane);
      },
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
      onSelect: (context) => {
        context.openChat?.();
      },
    },
    {
      id: "next-chapter",
      priority: 1000,
      title: { key: "next-chapter", defaultValue: "Next Chapter" },
      icon: (context) =>
        context.readingState.translation.value?.textDirection === "rtl" ? (
          <ChevronLeftIcon />
        ) : (
          <ChevronRightIcon />
        ),
      isDisabled: (context) =>
        !context.readingState.chapterData.value?.nextChapterApiLink ||
        context.readingState.loading.value,
      onSelect: (context) => {
        context.readingState.loadNextChapter();
      },
    },
  ];
}

function getDefaultVerseToolbarTools(): ManagedBibleVerseToolbarTool[] {
  return [
    {
      id: "copy-verse",
      priority: 200,
      title: { key: "copy-verse", defaultValue: "Copy" },
      icon: CopyVerseIcon,
      isVisible: (context) =>
        context.readingState.selectedVerses.value.length > 0,
      onSelect: async (context) => {
        if (context.readingState.selectedVerses.value.length === 0) return;

        const verseTexts = context.readingState.selectedVerses.value
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

        try {
          os.setClipboard(verseTexts);
          os.toast("Copied!");
          console.log("Verse(s) copied to clipboard");
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

        const verseTexts = context.readingState.selectedVerses.value
          .map((verse) => {
            const verseReference = `${verse.bookId} ${verse.chapterNumber}:${verse.verse.number}`;
            return `${verse.verse.content
              .map((part) => {
                if (typeof part === "string") return part;
                if (part && typeof part === "object" && "text" in part)
                  return (part as { text: string }).text;
                return "";
              })
              .join("")} (${verseReference} - ${verse.translationId})`;
          })
          .join("\n\n");

        os.share({
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

  /** Registers an empty-pane tool and returns an unregister callback. */
  registerEmptyPaneTool: (tool: ManagedBibleEmptyPaneTool) => () => void;

  /** Unregisters an empty-pane tool by ID. */
  unregisterEmptyPaneTool: (toolId: string) => void;

  /** Resolves/sorts empty-pane tools for the given context. */
  getEmptyPaneTools: (context: EmptyPaneToolContext) => BibleEmptyPaneTool[];

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
  const emptyPaneTools = signal<ManagedBibleEmptyPaneTool[]>(
    getDefaultEmptyPaneToolbarTools()
  );
  const belowReaderTools = signal<ManagedBibleBelowReaderToolbarTool[]>(
    getDefaultBelowReaderToolbarTools()
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
    }));

    return sortBy(tools, [(tool) => tool.priority]);
  };

  const listToolbarTools = (): ToolMetadata[] =>
    toolbarTools.value.map((tool) => ({ id: tool.id, title: tool.title }));

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

  const registerEmptyPaneTool = (tool: ManagedBibleEmptyPaneTool) => {
    validateToolActions(tool);
    const nextTools = emptyPaneTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    emptyPaneTools.value = [...nextTools, tool];

    return () => {
      unregisterEmptyPaneTool(tool.id);
    };
  };

  const unregisterEmptyPaneTool = (toolId: string) => {
    emptyPaneTools.value = emptyPaneTools.value.filter(
      (tool) => tool.id !== toolId
    );
  };

  const getEmptyPaneTools = (context: EmptyPaneToolContext) => {
    const tools = emptyPaneTools.value.map((tool) => ({
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

  return {
    registerToolbarTool,
    unregisterToolbarTool,
    getToolbarTools,
    listToolbarTools,
    registerVerseToolbarTool,
    unregisterVerseToolbarTool,
    getVerseToolbarTools,
    listVerseToolbarTools,
    registerEmptyPaneTool,
    unregisterEmptyPaneTool,
    getEmptyPaneTools,
    registerBelowReaderTool,
    unregisterBelowReaderTool,
    getBelowReaderTools,
  };
}
