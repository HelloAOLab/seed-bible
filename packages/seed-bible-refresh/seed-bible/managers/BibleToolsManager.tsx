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

function getDefaultTools(): ManagedBibleTool[] {
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

const managedTools = signal<ManagedBibleTool[]>(getDefaultTools());

const sortedTools = computed(() => {
  return [...managedTools.value].sort(
    (left, right) => left.priority - right.priority
  );
});

export function useBibleToolsManager() {
  const registerTool = (tool: ManagedBibleTool) => {
    const nextTools = managedTools.value.filter(
      (entry) => entry.id !== tool.id
    );
    managedTools.value = [...nextTools, tool];
  };

  const unregisterTool = (toolId: string) => {
    managedTools.value = managedTools.value.filter(
      (tool) => tool.id !== toolId
    );
  };

  const getTools = () => sortedTools.value;

  const getToolbarTools = (context: BibleToolContext) => {
    return sortedTools.value.map((tool) => ({
      id: tool.id,
      priority: tool.priority,
      title: tool.title,
      icon: tool.icon,
      disabled: tool.isDisabled?.(context) ?? false,
      onSelect: () => tool.onSelect?.(context),
    }));
  };

  return {
    registerTool,
    unregisterTool,
    getTools,
    getToolbarTools,
  };
}
