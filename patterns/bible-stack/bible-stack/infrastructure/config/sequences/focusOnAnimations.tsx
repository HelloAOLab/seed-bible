import { BibleSetupAnimationConfigs } from "./bibleSetupAnimation";
import { TestamentSelectionAnimationConfigs } from "./testamentSelectionAnimation";
import { SectionSelectionAnimationConfigs } from "./sectionSelectionAnimation";
import { TourGuideSectionAnimationConfigs } from "./tourGuideSectionAnimation";

export const FocusOnAnimations = {
  bibleSetup: BibleSetupAnimationConfigs,
  testamentSelection: TestamentSelectionAnimationConfigs,
  sectionSelection: SectionSelectionAnimationConfigs,
  tourGuideSection: TourGuideSectionAnimationConfigs,
} as const;

export type FocusOnAnimationKey = keyof typeof FocusOnAnimations;
export type FocusOnAnimationConfig =
  (typeof FocusOnAnimations)[FocusOnAnimationKey];
