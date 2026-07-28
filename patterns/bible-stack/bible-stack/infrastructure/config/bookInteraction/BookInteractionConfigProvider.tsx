import { delaysMap, type BookInteractionDelay } from "./delays";

export class BookInteractionConfigProvider {
  getDelay<K extends BookInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
