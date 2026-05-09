import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { TourGuieAdapterPort } from "bibleStack.application.ports.tourGuide";

// TODO: Correctly implement port
export class TourGuideAdapter implements TourGuieAdapterPort {
  startTourGuideSequence: (sectionData: StackSectionData) => Promise<void> =
    () => {
      return Promise.resolve();
    };
  endTourGuideSequence: () => void = () => {};
}
