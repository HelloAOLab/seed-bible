import {
  ShowAnimationPacings,
  type ShowAnimationPacing,
} from "bibleVizUtils.infrastructure.models.label";

export const ShowAnimationDurationMap: Record<ShowAnimationPacing, number> = {
  [ShowAnimationPacings.Slow]: 0.3,
  [ShowAnimationPacings.Regular]: 0.15,
  [ShowAnimationPacings.Fast]: 0.075,
  [ShowAnimationPacings.Instant]: 0,
};
export type ShowAnimationDurationMapType = typeof ShowAnimationDurationMap;

export const ShowAnimationConfig = {
  easing: { type: "sinusoidal", mode: "inout" },
} as const;
export type ShowAnimationConfigType = typeof ShowAnimationConfig;
