import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type { Piece } from "../../../domain/models/canvas";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type {
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../../domain/models/label";
import type { BibleStackEvents } from "../../../domain/models/events";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface LabelDataStorePort {
  getDataByOwnerId(id: string): InfoLabelData | undefined;
}

export interface SectionSelectionAdapterPort {
  select: (
    data: StackSectionData,
    pacing?: StackUpdatePacing | undefined
  ) => Promise<void>;
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
    piece: Piece<"StackSectionShadow" | "StackSection">,
    pacing?: ShowSequencePacing
  ) => Promise<void>;
  changeIntensity: (
    piece: Piece<"StackSectionShadow">,
    translucencyMode: LabelTranslucencyMode,
    pacing?: ShowSequencePacing
  ) => Promise<void>;
}
