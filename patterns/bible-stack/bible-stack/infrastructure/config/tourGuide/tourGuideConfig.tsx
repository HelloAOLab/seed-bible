import type { HighlightPacing } from "../../../domain/models/pieces";

export const TourGuideConfig: {
  initialFocusDuration: number;
  delayBetweenBookHighlight: number;
  unhighlightDelay: number;
  bookHighlightPacing: HighlightPacing;
} = {
  initialFocusDuration: 0.25,
  delayBetweenBookHighlight: 250,
  unhighlightDelay: 50,
  bookHighlightPacing: "Fast",
};
