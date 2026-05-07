import type { HighlightDelay } from "bibleStack.application.ports.pieces";

export const delaysMap: Record<HighlightDelay, number> = {
  UserFocusUnhighlightDelay: 2000,
  TransitionUnhighlightDelay: 4000,
} as const;
