import { delaysMap, type SectionInteractionDelay } from "./delays";

export class SectionInteractionConfigProvider {
  getDelay<K extends SectionInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
