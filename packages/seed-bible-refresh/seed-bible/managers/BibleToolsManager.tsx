import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import type { JSX, VNode } from "preact";
import { computed, signal } from "@preact/signals";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "./BibleSelectorManager";

type BibleToolIcon = () => JSX.Element | VNode;

export interface BibleTool {
  id: string;
  priority: number;
  title: string;
  icon: BibleToolIcon;
}

export interface BibleToolContext {
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
}

export interface BibleReaderToolbarTool extends BibleTool {
  disabled: boolean;
  onSelect: () => void;
}

export interface ManagedBibleToolbarTool extends BibleTool {
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
      id: "open-selector",
      priority: 100,
      title: "Open Book Selector",
      icon: OpenSelectorIcon,
      isDisabled: (context) => context.readingState.loading.value,
      onSelect: (context) => {
        context.selectorState.setOpen(true, context.readingState);
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

const toolbarTools = signal<ManagedBibleToolbarTool[]>(
  getDefaultToolbarTools()
);

const sortedToolbarTools = computed(() => {
  return [...toolbarTools.value].sort(
    (left, right) => left.priority - right.priority
  );
});

export function useBibleToolsManager() {
  const registerToolbarTool = (tool: ManagedBibleToolbarTool) => {
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
