import { delaysMap } from "./delays";
import type { BookInteractionDelay } from "../../../application/ports/out/BookInteraction";

export class BookInteractionConfigProvider {
  getDelay<K extends BookInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
