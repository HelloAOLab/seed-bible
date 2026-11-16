import type { ExperienceKey } from "./experience";
import type { NavigationState } from "./navigation";
import type { ReadingState } from "./scripture";

export interface DomainEventMap {
  OnExperienceChanged: { experience: ExperienceKey | null };
  OnNavigationStateChanged: { state: NavigationState };
  OnReadingStateChanged: { reading: ReadingState | null };
}
