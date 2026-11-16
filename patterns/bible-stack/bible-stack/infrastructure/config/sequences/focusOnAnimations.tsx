import type { FocusOnAnimationKey } from "../../../application/ports/out/Camera";
import { BibleSetupAnimationConfigs } from "./bibleSetupAnimation";
import { TestamentSelectionAnimationConfigs } from "./testamentSelectionAnimation";
import { SectionSelectionAnimationConfigs } from "./sectionSelectionAnimation";
import { TourGuideSectionAnimationConfigs } from "./tourGuideSectionAnimation";

export const FocusOnAnimations = {
  bibleSetup: BibleSetupAnimationConfigs,
  testamentSelection: TestamentSelectionAnimationConfigs,
  sectionSelection: SectionSelectionAnimationConfigs,
  tourGuideSection: TourGuideSectionAnimationConfigs,
} as const satisfies Record<FocusOnAnimationKey, unknown>;

export type FocusOnAnimationConfig =
  (typeof FocusOnAnimations)[FocusOnAnimationKey];
