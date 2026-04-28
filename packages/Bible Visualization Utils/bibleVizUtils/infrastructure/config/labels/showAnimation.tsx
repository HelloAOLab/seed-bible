import {
  ShowSequencePacings,
  type ShowSequencePacing,
} from "bibleVizUtils.domain.models.label";

export const ShowAnimationDurationMap: Record<ShowSequencePacing, number> = {
  [ShowSequencePacings.Slow]: 0.3,
  [ShowSequencePacings.Regular]: 0.15,
  [ShowSequencePacings.Fast]: 0.075,
  [ShowSequencePacings.Instant]: 0,
};
export type ShowAnimationDurationMapType = typeof ShowAnimationDurationMap;

export const ShowAnimationConfig = {
  easing: { type: "sinusoidal", mode: "inout" },
} as const;
export type ShowAnimationConfigType = typeof ShowAnimationConfig;
