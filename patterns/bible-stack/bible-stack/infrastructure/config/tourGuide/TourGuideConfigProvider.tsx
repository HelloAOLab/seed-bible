import type { HighlightPacing } from "../../../domain/models/pieces";
import { TourGuideConfig } from "./tourGuideConfig";

export class TourGuideConfigProvider {
  getInitialFocusDuration(): number {
    return TourGuideConfig.initialFocusDuration;
  }

  getDelayBetweenBookHighlight(): number {
    return TourGuideConfig.delayBetweenBookHighlight;
  }

  getUnhighlightDelay(): number {
    return TourGuideConfig.unhighlightDelay;
  }

  getBookHighlightPacing(): HighlightPacing {
    return TourGuideConfig.bookHighlightPacing;
  }
}
