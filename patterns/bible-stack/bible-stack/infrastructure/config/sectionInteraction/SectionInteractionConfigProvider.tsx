import { delaysMap } from "./delays";
import type {
  SectionInteractionConfigProviderPort,
  SectionInteractionDelay,
} from "../../../application/ports/out/SectionInteraction";

export class SectionInteractionConfigProvider implements SectionInteractionConfigProviderPort {
  getDelay<K extends SectionInteractionDelay>(delay: K): (typeof delaysMap)[K] {
    return delaysMap[delay];
  }
}
