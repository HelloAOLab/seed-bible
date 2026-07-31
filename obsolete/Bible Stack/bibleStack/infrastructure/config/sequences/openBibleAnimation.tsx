import { StackPresenceNavigationPacings } from "bibleStack.domain.models.userPresence";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

export const OpenBibleAnimationDurations: Record<
  StackPresenceNavigationPacing,
  number
> = {
  [StackPresenceNavigationPacings.Regular]: 1,
  [StackPresenceNavigationPacings.Double]: 2,
} as const;

export const OpenBibleAnimationEasing = {
  type: "sinusoidal",
  mode: "inout",
} as const;
export type OpenBibleAnimationEasingType = typeof OpenBibleAnimationEasing;
