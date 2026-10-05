import { delaysMap } from "./delays";
import type {
  BookInteractionDelay,
  BookInteractionConfigProviderPort,
} from "../../../application/ports/out/BookInteractionConfigProvider";

export class BookInteractionConfigProvider implements BookInteractionConfigProviderPort {
  getDelay<K extends BookInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
