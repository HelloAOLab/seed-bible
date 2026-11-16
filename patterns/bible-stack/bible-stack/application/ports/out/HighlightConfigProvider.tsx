import type { HighlightPacing } from "../../../domain/models/pieces";
export const HighlightDelays = {
  UserFocusUnhighlightDelay: "UserFocusUnhighlightDelay",
  TransitionUnhighlightDelay: "TransitionUnhighlightDelay",
} as const;

export type HighlightDelay =
  (typeof HighlightDelays)[keyof typeof HighlightDelays];

export interface HighlightConfigProviderPort {
  getDelay(delay: HighlightDelay): number;
  getHighlightDuration(pacing: HighlightPacing): number;
}
