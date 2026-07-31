import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackChapterData";
import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { ShowSequencePacing } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/label";

export interface ChapterSelectionParams {
  data: StackChapterData;
  pacing?: StackUpdatePacing;
}

export interface ChapterSelectionAdapterPort {
  select(params: ChapterSelectionParams): Promise<void>;
  deselect(params: ChapterSelectionParams): Promise<void>;
}

export interface LabelManagerPort {
  hideLabel: (
    piece: Piece<"StackChapter">,
    pacing?: ShowSequencePacing
  ) => Promise<void>;
}

export interface VersesBundleLifecycleAdapterPort {
  spawnVersesBundleDomain(): Piece<"VersesBundle">;
  despawnVersesBundle(piece: Piece<"VersesBundle">): void;
  despawnVerse: (piece: Piece<"Verse">) => void;
}
