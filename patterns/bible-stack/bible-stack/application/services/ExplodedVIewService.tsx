import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { ExplodedViewServicePort } from "../ports/in/ExplodedView";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";

export class ExplodedViewService implements ExplodedViewServicePort {
  #currentExplodedSection: StackSectionData | undefined;

  get currentExplodedSection(): StackSectionData | undefined {
    return this.#currentExplodedSection;
  }

  registerExplodedSection(section: StackSectionData): void {
    this.#currentExplodedSection = section;
  }

  explodeSection(_params: {
    data: StackSectionData;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    // TODO: Bring explode section logic here
    return Promise.resolve();
  }
  implodeSection(_params: {
    data: StackSectionData;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    // TODO: Bring implode section logic here
    return Promise.resolve();
  }
}
