import type { BibleType } from "../../../domain/models/canvas";

export type TestamentHighlightSequenceConfigKey =
  | "initialDelay"
  | "staggerDelay"
  | "unhighlightDelay";

export interface SequenceConfigProviderPort {
  getCrackOpenBibleAnimationDuration(bibleType: BibleType): number;
  getTestamentHighlightSequenceConfig(
    key: TestamentHighlightSequenceConfigKey
  ): number;
}
