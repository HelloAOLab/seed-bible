import type { SectionInteractionDelay } from "./SectionInteractionConfigProvider";
export interface SectionInteractionConfigProviderPort {
  getDelay: (delay: SectionInteractionDelay) => number;
}
