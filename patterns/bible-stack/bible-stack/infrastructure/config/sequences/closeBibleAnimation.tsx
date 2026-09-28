import { StackPresenceNavigationPacings } from "../../../domain/models/userPresence";
import type { StackPresenceNavigationPacing } from "../../../domain/models/userPresence";

export const CloseBibleAnimationDurations: Record<
  StackPresenceNavigationPacing,
  number
> = {
  [StackPresenceNavigationPacings.Regular]: 1,
  [StackPresenceNavigationPacings.Double]: 0.5,
} as const;

export const CloseBibleAnimationEasing = {
  type: "sinusoidal",
  mode: "inout",
} as const;
export type CloseBibleAnimationEasingType = typeof CloseBibleAnimationEasing;
