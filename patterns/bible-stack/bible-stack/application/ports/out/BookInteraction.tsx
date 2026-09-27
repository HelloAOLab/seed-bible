import type { BookInteractionDelay } from "./BookInteractionConfigProvider";
export interface BookInteractionConfigProviderPort {
  getDelay: (delay: BookInteractionDelay) => number;
}
