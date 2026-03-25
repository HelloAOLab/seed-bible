import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import type { JSX, VNode } from "preact";
import { computed, signal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";

type BibleToolIcon = () => JSX.Element | VNode;
type ToolPredicateResult = boolean | ReadonlySignal<boolean>;
type ToolPredicate<TContext> = (context: TContext) => ToolPredicateResult;

export interface BibleTool {
  id: string;
  priority: number;
  title: string;
  icon: BibleToolIcon;
}

export interface WindowContext {
  innerWidth: ReadonlySignal<number>;
  innerHeight: ReadonlySignal<number>;
}

export interface BibleToolContext {
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
  tabs: TabsManager;
  panesManager: PanesManager;
  window?: WindowContext | null;
  openSidebar: () => void;
}

export interface BibleReaderToolbarTool extends BibleTool {
  disabled: boolean;
  visible: boolean;
  onSelect: () => void;
}

export interface ManagedBibleToolbarTool extends BibleTool {
  isDisabled?: ToolPredicate<BibleToolContext>;
  isVisible?: ToolPredicate<BibleToolContext>;
  onSelect?: (context: BibleToolContext) => void;
}

export interface BibleReaderVerseToolbarTool extends BibleTool {
  disabled: boolean;
  visible: boolean;
  onSelect: () => void;
}

export interface ManagedBibleVerseToolbarTool extends BibleTool {
  isDisabled?: ToolPredicate<BibleToolContext>;
  isVisible?: ToolPredicate<BibleToolContext>;
  onSelect?: (context: BibleToolContext) => void;
}

export interface EmptyPaneToolContext {
  selectorState: BibleSelectorState;
  currentPane: Pane;
  panesManager: PanesManager;
  tabs: TabsManager;
  window?: WindowContext | null;
}

export interface BibleEmptyPaneTool extends BibleTool {
  disabled: ReadonlySignal<boolean>;
  visible: ReadonlySignal<boolean>;
  onSelect: () => void;
}

export interface ManagedBibleEmptyPaneTool extends BibleTool {
  isDisabled?: ToolPredicate<EmptyPaneToolContext>;
  isVisible?: ToolPredicate<EmptyPaneToolContext>;
  onSelect?: (context: EmptyPaneToolContext) => void;
}

export interface BibleBelowReaderToolbarTool extends BibleTool {
  disabled: ReadonlySignal<boolean>;
  visible: ReadonlySignal<boolean>;
  onSelect: () => void;
}

export interface BibleBelowReaderToolContext extends BibleToolContext {
  currentPane: Pane;
}

export interface ManagedBibleBelowReaderToolbarTool extends BibleTool {
  isDisabled?: ToolPredicate<BibleBelowReaderToolContext>;
  isVisible?: ToolPredicate<BibleBelowReaderToolContext>;
  onSelect?: (context: BibleBelowReaderToolContext) => void;
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

function MenuIcon() {
  return <MaterialIcon>menu</MaterialIcon>;
}

function PreviousChapterIcon() {
  return <MaterialIcon>chevron_left</MaterialIcon>;
}

function OpenSelectorIcon() {
  return <SeedBibleIcon />;
}

function NextChapterIcon() {
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

function OpenGridPortalIcon() {
  return <MaterialIcon>view_in_ar</MaterialIcon>;
}

function OpenMapPortalIcon() {
  return <MaterialIcon>map</MaterialIcon>;
}

function getDefaultEmptyPaneToolbarTools(): ManagedBibleEmptyPaneTool[] {
  return [
    {
      id: "open-in-selector",
      priority: 0,
      title: "Open a book",
      icon: OpenInSelectorIcon,
      onSelect: (context) => {
        context.selectorState.setOpen(true, context.currentPane);
      },
    },
    {
      id: "open-grid-portal",
      priority: 100,
      title: "Open grid portal",
      icon: OpenGridPortalIcon,
      isDisabled: (context) =>
        context.panesManager.panes.value.some(
          (pane) =>
            (pane.gridPortal !== null || pane.mapPortal !== null) &&
            pane.id !== context.currentPane.id
        ),
      onSelect: (context) => {
        create({
          home: true,
          color: "red",
        });
        context.panesManager.openInPane(context.currentPane.id, {
          gridPortal: "home",
        });
      },
    },
    {
      id: "open-map-portal",
      priority: 110,
      title: "Open map portal",
      icon: OpenMapPortalIcon,
      isDisabled: (context) =>
        context.panesManager.panes.value.some(
          (pane) =>
            (pane.gridPortal !== null || pane.mapPortal !== null) &&
            pane.id !== context.currentPane.id
        ),
      onSelect: (context) => {
        context.panesManager.openInPane(context.currentPane.id, {
          mapPortal: "map_portal",
        });
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
          <span>Powered by</span>
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
      title: "Previous Chapter",
      icon: PreviousChapterIcon,
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
      title: "Open sidebar",
      icon: MenuIcon,
      isVisible: (context) =>
        !!context.openSidebar &&
        typeof context.window?.innerWidth.value === "number" &&
        context.window?.innerWidth.value < 768,
      onSelect: (context) => {
        context.openSidebar?.();
      },
    },
    {
      id: "open-selector",
      priority: 100,
      title: "Open Book Selector",
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
      id: "next-chapter",
      priority: 1000,
      title: "Next Chapter",
      icon: NextChapterIcon,
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
      title: "Copy Verse",
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
      title: "Share Verse",
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
      title: "Clear Selection",
      icon: ClearSelectionIcon,
      isVisible: (context) =>
        context.readingState.selectedVerses.value.length > 0,
      onSelect: (context) => {
        context.readingState.clearSelectedVerses();
      },
    },
  ];
}

export type ToolsManager = ReturnType<typeof createBibleToolsManager>;

export function createBibleToolsManager() {
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

  const sortedToolbarTools = computed(() => {
    return [...toolbarTools.value].sort(
      (left, right) => left.priority - right.priority
    );
  });

  const sortedVerseToolbarTools = computed(() => {
    return [...verseToolbarTools.value].sort(
      (left, right) => left.priority - right.priority
    );
  });

  const sortedEmptyPaneTools = computed(() => {
    return [...emptyPaneTools.value].sort(
      (left, right) => left.priority - right.priority
    );
  });

  const sortedBelowReaderTools = computed(() => {
    return [...belowReaderTools.value].sort(
      (left, right) => left.priority - right.priority
    );
  });

  const registerToolbarTool = (tool: ManagedBibleToolbarTool) => {
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
    return sortedToolbarTools.value.map((tool) => ({
      id: tool.id,
      priority: tool.priority,
      title: tool.title,
      icon: tool.icon,
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
    }));
  };

  const registerVerseToolbarTool = (tool: ManagedBibleVerseToolbarTool) => {
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
    return sortedVerseToolbarTools.value.map((tool) => ({
      id: tool.id,
      priority: tool.priority,
      title: tool.title,
      icon: tool.icon,
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
    }));
  };

  const registerEmptyPaneTool = (tool: ManagedBibleEmptyPaneTool) => {
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
    return sortedEmptyPaneTools.value.map((tool) => ({
      id: tool.id,
      priority: tool.priority,
      title: tool.title,
      icon: tool.icon,
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
    }));
  };

  const registerBelowReaderTool = (
    tool: ManagedBibleBelowReaderToolbarTool
  ) => {
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
    return sortedBelowReaderTools.value.map((tool) => ({
      id: tool.id,
      priority: tool.priority,
      title: tool.title,
      icon: tool.icon,
      disabled: resolveToolPredicate(tool.isDisabled, context, false),
      visible: resolveToolPredicate(tool.isVisible, context, true),
      onSelect: () => tool.onSelect?.(context),
    }));
  };

  return {
    registerToolbarTool,
    unregisterToolbarTool,
    getToolbarTools,
    registerVerseToolbarTool,
    unregisterVerseToolbarTool,
    getVerseToolbarTools,
    registerEmptyPaneTool,
    unregisterEmptyPaneTool,
    getEmptyPaneTools,
    registerBelowReaderTool,
    unregisterBelowReaderTool,
    getBelowReaderTools,
  };
}
