import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { ExplodedViewServicePort as DomainExplodedViewServicePort } from "bibleStack.application.ports.explodedView";
import type { ExplodedViewServicePort } from "bibleStack.application.ports.userPresence";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

export class ExplodedViewService
  implements DomainExplodedViewServicePort, ExplodedViewServicePort
{
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
