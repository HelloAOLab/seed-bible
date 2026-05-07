import { delaysMap } from "bibleStack.infrastructure.config.highlight.delays";
import type {
  HighlightConfigProviderPort,
  HighlightDelay,
} from "bibleStack.application.ports.pieces";

export class HighlightConfigProvider implements HighlightConfigProviderPort {
  getDelay(delay: HighlightDelay): number {
    return delaysMap[delay];
  }
}
