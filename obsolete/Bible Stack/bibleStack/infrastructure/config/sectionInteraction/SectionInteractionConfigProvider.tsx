import {
  delaysMap,
  type SectionInteractionDelay,
} from "bibleStack.infrastructure.config.sectionInteraction.delays";
import type { SectionInteractionConfigProviderPort } from "bibleStack.infrastructure.ports.sectionInteraction";

export class SectionInteractionConfigProvider implements SectionInteractionConfigProviderPort {
  getDelay<K extends SectionInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
