import type {
  BookInteractionDelay,
  delaysMap,
} from "bibleStack.infrastructure.config.bookInteraction.delays";

export interface BookInteractionConfigProviderPort {
  getDelay: <K extends BookInteractionDelay>(delay: K) => (typeof delaysMap)[K];
}
