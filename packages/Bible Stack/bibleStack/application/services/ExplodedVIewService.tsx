import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { ExplodedViewServicePort } from "bibleStack.application.ports.explodedView";

export class ExplodedViewService implements ExplodedViewServicePort {
  explodeSection: (data: StackSectionData) => void = () => {
    // TODO: Bring explode section logic here
  };
  implodeSection: (data: StackSectionData) => void = () => {
    // TODO: Bring implode section logic here
  };
}
