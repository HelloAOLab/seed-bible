import type { HighlightPacing } from "../../../domain/models/pieces";
import type { Sound } from "../audio/sounds";
import { TourGuideConfig } from "./tourGuideConfig";
import { TourGuideSounds } from "./tourGuideSounds";

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

  getSound(totalBooks: number, index: number): Sound | undefined {
    return TourGuideSounds[totalBooks]?.[index];
  }
}
