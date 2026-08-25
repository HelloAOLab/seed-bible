import type { StackSectionData } from "../../domain/entities/StackSectionData";

export interface TourGuieAdapterPort {
  startTourGuideSequence: (sectionData: StackSectionData) => Promise<void>;
  endTourGuideSequence: () => void;
}
