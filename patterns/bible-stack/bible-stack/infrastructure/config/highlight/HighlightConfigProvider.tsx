import type {
  HighlightConfigProviderPort,
  HighlightDelay,
} from "../../../application/ports/pieces";
import type { HighlightPacing } from "../../../domain/models/pieces";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";

const delaysMap: Record<HighlightDelay, number> = {
  UserFocusUnhighlightDelay: 2000,
  TransitionUnhighlightDelay: 4000,
};

const animationDurationsMap: Record<HighlightPacing, number> = {
  Instant: 0,
  Fast: 0.15,
  Regular: 0.3,
  Slow: 0.5,
};

const highlightEasing: Easing = { type: "sinusoidal", mode: "inout" };

export class HighlightConfigProvider implements HighlightConfigProviderPort {
  getDelay(delay: HighlightDelay): number {
    return delaysMap[delay];
  }

  getHighlightDuration(pacing: HighlightPacing): number {
    return animationDurationsMap[pacing];
  }

  getHighlightEasing(): Easing {
    return highlightEasing;
  }
}
