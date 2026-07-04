import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";

/** Selected-book grid layout produced by the SelectedBookLayoutService. */
export interface SelectedBookLayout {
  columns?: number;
  rows?: number;
  height?: number;
}

export interface UpdateCommand {
  data: StackBookData | StackSectionBookData;
  pacing: StackUpdatePacing;
}

/**
 * Result the (future) section render loop consumes from a per-book layout pass —
 * the same shape the legacy `HandleBookDataInStack` returned.
 */
export interface BookVisualUpdateResult {
  absBookDesiredPosition: { x: number; y: number } | undefined;
  halfInitialBookScales: { x: number; y: number } | undefined;
  selectedBookHeight: number | undefined;
  marginToAdd: number;
  computedAnimations: Array<Promise<void>>;
}

export interface BookStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
