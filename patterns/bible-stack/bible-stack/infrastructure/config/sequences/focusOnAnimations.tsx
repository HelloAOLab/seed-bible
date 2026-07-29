import { BibleSetupAnimationConfigs } from "./bibleSetupAnimation";
import { TestamentSelectionAnimationConfigs } from "./testamentSelectionAnimation";

export const FocusOnAnimations = {
  bibleSetup: BibleSetupAnimationConfigs,
  testamentSelection: TestamentSelectionAnimationConfigs,
} as const;

export type FocusOnAnimationKey = keyof typeof FocusOnAnimations;
export type FocusOnAnimationConfig =
  (typeof FocusOnAnimations)[FocusOnAnimationKey];
