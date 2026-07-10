import { BibleTypes } from "bibleVizUtils.domain.models.canvas";
import type { BibleType } from "bibleVizUtils.domain.models.canvas";

export const CrackOpenBibleAnimationDurations: Record<BibleType, number> = {
  [BibleTypes.Default]: 2,
  [BibleTypes.PlatformerGame]: 0,
} as const;

export const CrackOpenBibleAnimationEasing = {
  type: "sinusoidal",
  mode: "inout",
} as const;
export type CrackOpenBibleAnimationEasingType =
  typeof CrackOpenBibleAnimationEasing;

export const CrackOpenBibleHighlightConfig = {
  initialDelay: 500,
  staggerDelay: 100,
  unhighlightDelay: 4000,
} as const;
export type CrackOpenBibleHighlightConfigType =
  typeof CrackOpenBibleHighlightConfig;
