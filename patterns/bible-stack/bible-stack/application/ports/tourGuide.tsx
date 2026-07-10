import type { StackSectionData } from "../../domain/entities/StackSectionData";

export interface TourGuieAdapterPort {
  startTourGuideSequence: (sectionData: StackSectionData) => Promise<void>;
  endTourGuideSequence: () => void;
}

export interface TourGuideServicePort {
  ongoingTourGuideSectionData: StackSectionData | undefined;
  isThereAnOngoingTourGuide: () => boolean;
  beginTourGuide: (data: StackSectionData) => void;
  stopTourGuide: () => void;
}
