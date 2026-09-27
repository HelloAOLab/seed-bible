import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { Piece } from "../../../domain/models/canvas";

export interface ChapterSelectionParams {
  data: StackChapterData;
  pacing?: StackUpdatePacing;
}

export interface ChapterSelectionAdapterPort {
  select(params: ChapterSelectionParams): Promise<void>;
  deselect(params: ChapterSelectionParams): Promise<void>;
}

export interface VersesBundleLifecycleAdapterPort {
  spawnVersesBundleDomain(): Piece<"VersesBundle">;
  despawnVersesBundle(piece: Piece<"VersesBundle">): void;
  despawnVerse: (piece: Piece<"Verse">) => void;
}
