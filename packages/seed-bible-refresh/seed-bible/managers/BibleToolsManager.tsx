import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import type { JSX, VNode } from "preact";
import { computed, signal } from "@preact/signals";

type BibleToolIcon = () => JSX.Element | VNode;

export interface BibleTool {
  id: string;
  priority: number;
  title: string;
  icon: BibleToolIcon;
}

export interface BibleToolContext {
  canGoToPreviousChapter: boolean;
  canGoToNextChapter: boolean;
  disabled: boolean;
  onGoToPreviousChapter: () => void;
  onOpenSelector: () => void;
  onGoToNextChapter: () => void;
}

export interface BibleReaderToolbarTool extends BibleTool {
  disabled: boolean;
  onSelect: () => void;
}

export interface ManagedBibleTool extends BibleTool {
  isDisabled?: (context: BibleToolContext) => boolean;
  onSelect?: (context: BibleToolContext) => void;
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

function getDefaultToolbarTools(): ManagedBibleTool[] {
  return [
    {
      id: "previous-chapter",
      priority: 100,
      title: "Previous Chapter",
      icon: PreviousChapterIcon,
      isDisabled: (context) =>
        !context.canGoToPreviousChapter || context.disabled,
      onSelect: (context) => {
        context.onGoToPreviousChapter();
      },
    },
    {
      id: "open-selector",
      priority: 200,
      title: "Open Book Selector",
      icon: OpenSelectorIcon,
      isDisabled: (context) => context.disabled,
      onSelect: (context) => {
        context.onOpenSelector();
      },
    },
    {
      id: "next-chapter",
      priority: 300,
      title: "Next Chapter",
      icon: NextChapterIcon,
      isDisabled: (context) => !context.canGoToNextChapter || context.disabled,
      onSelect: (context) => {
        context.onGoToNextChapter();
      },
    },
  ];
}

const toolbarTools = signal<ManagedBibleTool[]>(getDefaultToolbarTools());

const sortedToolbarTools = computed(() => {
  return [...toolbarTools.value].sort(
    (left, right) => left.priority - right.priority
  );
});

export function useBibleToolsManager() {
  const registerToolbarTool = (tool: ManagedBibleTool) => {
    const nextTools = toolbarTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    toolbarTools.value = [...nextTools, tool];
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
      disabled: tool.isDisabled?.(context) ?? false,
      onSelect: () => tool.onSelect?.(context),
    }));
  };

  return {
    registerToolbarTool,
    unregisterToolbarTool,
    getToolbarTools,
  };
}
