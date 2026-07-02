import type {
  SectionInteractionDelay,
  delaysMap,
} from "bibleStack.infrastructure.config.sectionInteraction.delays";

export interface SectionInteractionConfigProviderPort {
  getDelay: <K extends SectionInteractionDelay>(
    delay: K
  ) => (typeof delaysMap)[K];
}
