import { delaysMap } from "./delays";
import type {
  SectionInteractionDelay,
  SectionInteractionConfigProviderPort,
} from "../../../application/ports/out/SectionInteractionConfigProvider";

export class SectionInteractionConfigProvider implements SectionInteractionConfigProviderPort {
  getDelay<K extends SectionInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
