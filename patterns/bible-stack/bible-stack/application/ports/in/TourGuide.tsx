import type { StackSectionData } from "../../../domain/entities/StackSectionData";

export interface TourGuideServicePort {
  ongoingTourGuideSectionData: StackSectionData | undefined;
  isThereAnOngoingTourGuide: () => boolean;
  beginTourGuide: (data: StackSectionData) => Promise<void>;
  stopTourGuide: () => void;
}
