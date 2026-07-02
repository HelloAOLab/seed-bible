import type { InfoLabelData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/InfoLabelData";
import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type {
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/label";
import type { BibleStackEvents } from "@packages/Bible Stack/bibleStack/domain/models/events";

export interface LabelDataStorePort {
  getDataByOwnerId(id: string): InfoLabelData | undefined;
}

export interface SectionSelectionAdapterPort {
  select: (data: StackSectionData) => Promise<void>;
  deselect: (data: StackSectionData) => Promise<void>;
}

export interface SectionSelectionEventPort {
  emit: <K extends "OnSectionBeginSelect" | "OnSectionEndSelect">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface PieceLabelServicePort {
  showLabel: (params: {
    piece: Piece<"StackSectionShadow">;
    translucencyMode: LabelTranslucencyMode;
    pacing?: ShowSequencePacing;
  }) => void;
  hideLabel: (
    piece: Piece<"StackSectionShadow">,
    pacing?: ShowSequencePacing
  ) => Promise<void>;
  changeIntensity: (
    piece: Piece<"StackSectionShadow">,
    translucencyMode: LabelTranslucencyMode,
    pacing?: ShowSequencePacing
  ) => Promise<void>;
}
