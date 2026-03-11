import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import type { JSX, VNode } from "preact";

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
  isDisabled: (context: BibleToolContext) => boolean;
  onSelect: (context: BibleToolContext) => void;
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

export class BibleToolsManager {
  private readonly tools = new Map<string, ManagedBibleTool>();

  registerTool(tool: ManagedBibleTool) {
    this.tools.set(tool.id, tool);
  }

  unregisterTool(toolId: string) {
    this.tools.delete(toolId);
  }

  getTools(): BibleTool[] {
    return this.getSortedTools().map(({ id, priority, title, icon }) => ({
      id,
      priority,
      title,
      icon,
    }));
  }

  getToolbarTools(context: BibleToolContext): BibleReaderToolbarTool[] {
    return this.getSortedTools().map((tool) => ({
      id: tool.id,
      priority: tool.priority,
      title: tool.title,
      icon: tool.icon,
      disabled: tool.isDisabled(context),
      onSelect: () => {
        tool.onSelect(context);
      },
    }));
  }

  private getSortedTools(): ManagedBibleTool[] {
    return [...this.tools.values()].sort(
      (left, right) => left.priority - right.priority
    );
  }
}

export const bibleToolsManager = new BibleToolsManager();

bibleToolsManager.registerTool({
  id: "previous-chapter",
  priority: 100,
  title: "Previous Chapter",
  icon: PreviousChapterIcon,
  isDisabled: (context) => !context.canGoToPreviousChapter || context.disabled,
  onSelect: (context) => {
    context.onGoToPreviousChapter();
  },
});

bibleToolsManager.registerTool({
  id: "open-selector",
  priority: 200,
  title: "Open Book Selector",
  icon: OpenSelectorIcon,
  isDisabled: (context) => context.disabled,
  onSelect: (context) => {
    context.onOpenSelector();
  },
});

bibleToolsManager.registerTool({
  id: "next-chapter",
  priority: 300,
  title: "Next Chapter",
  icon: NextChapterIcon,
  isDisabled: (context) => !context.canGoToNextChapter || context.disabled,
  onSelect: (context) => {
    context.onGoToNextChapter();
  },
});
