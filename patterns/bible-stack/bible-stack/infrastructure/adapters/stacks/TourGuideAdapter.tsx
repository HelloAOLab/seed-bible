import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { TourGuieAdapterPort } from "../../../application/ports/tourGuide";

// TODO: Correctly implement port
export class TourGuideAdapter implements TourGuieAdapterPort {
  startTourGuideSequence: (sectionData: StackSectionData) => Promise<void> =
    () => {
      return Promise.resolve();
    };
  endTourGuideSequence: () => void = () => {};
}
