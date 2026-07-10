import type { BiblePiece } from "./canvas";
import type { HexString } from "./commonTypes";

export interface HighlightData {
  color: HexString;
  typeOfPiece: BiblePiece;
  key: string;
}

export const HighlightStates = {
  Idle: "Idle",
  Highlighting: "Highlighting",
  Unhighlighting: "Unhighlighting",
  Highlighted: "Highlighted",
} as const;
export type HighlightState =
  (typeof HighlightStates)[keyof typeof HighlightStates];
export const HighlightEvents = {
  RequestHighlight: "RequestHighlight",
  RequestUnhighlight: "RequestUnhighlight",
  SequenceComplete: "SequenceComplete",
} as const;
export type HighlightEvent =
  (typeof HighlightEvents)[keyof typeof HighlightEvents];
