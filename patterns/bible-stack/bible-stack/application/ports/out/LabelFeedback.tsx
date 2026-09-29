import type { InfoLabelData } from "../../../domain/entities/InfoLabelData";
import type {
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../../domain/models/label";

export interface LabelFeedbackPort {
  displayAttentionFeedback(data: InfoLabelData): void;
  stopAttentionFeedback(data: InfoLabelData): void;
  displayShowFeedback(params: {
    data: InfoLabelData;
    pacing: ShowSequencePacing;
  }): Promise<void>;
  displayHideFeedback(params: {
    data: InfoLabelData;
    pacing: ShowSequencePacing;
  }): Promise<void>;
  displayChangedIntensityFeedback(params: {
    data: InfoLabelData;
    translucencyMode: LabelTranslucencyMode;
    pacing: ShowSequencePacing;
  }): Promise<void>;
  stopOpacityTransition(data: InfoLabelData): void;
  disposeAll(): void;
}
