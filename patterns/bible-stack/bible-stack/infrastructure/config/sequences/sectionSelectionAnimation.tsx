export const SectionSelectionAnimationConfigs = {
  duration: 1,
  zoom: 8,
  rotationX: 1.01229,
  rotationY: 0.5,
  easingType: "sinusoidal",
  easingMode: "inout",
} as const;

export type SectionSelectionAnimationConfigsType =
  typeof SectionSelectionAnimationConfigs;
