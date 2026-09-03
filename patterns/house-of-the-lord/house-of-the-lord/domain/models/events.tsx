import type { NavigationState } from "./navigation";
import type { ReadingState } from "./scripture";

export interface DomainEventMap {
  OnNavigationStateChanged: { state: NavigationState };
  OnReadingStateChanged: { reading: ReadingState | null };
  OnThemeChanged: { css: string };
}
