import type { StackSectionData } from "../../../domain/entities/StackSectionData";

export interface TourGuidePort {
  startTourGuideSequence(sectionData: StackSectionData): Promise<void>;
  endTourGuideSequence(): void;
}
