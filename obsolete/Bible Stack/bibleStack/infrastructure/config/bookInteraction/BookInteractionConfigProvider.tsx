import {
  delaysMap,
  type BookInteractionDelay,
} from "bibleStack.infrastructure.config.bookInteraction.delays";
import type { BookInteractionConfigProviderPort } from "bibleStack.infrastructure.ports.bookInteraction";

export class BookInteractionConfigProvider implements BookInteractionConfigProviderPort {
  getDelay<K extends BookInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
