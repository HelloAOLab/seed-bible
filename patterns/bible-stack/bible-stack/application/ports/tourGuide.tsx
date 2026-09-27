import type { StackSectionData } from "../../domain/entities/StackSectionData";

export interface TourGuideAdapterPort {
  startTourGuideSequence: (sectionData: StackSectionData) => Promise<void>;
  endTourGuideSequence: () => void;
}
