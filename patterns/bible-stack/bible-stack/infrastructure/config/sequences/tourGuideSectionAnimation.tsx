export const TourGuideSectionAnimationConfigs = {
  duration: 0.25,
  zoom: 6,
  rotationX: 1.01229,
  rotationY: 0.5,
  easingType: "sinusoidal",
  easingMode: "inout",
} as const;

export type TourGuideSectionAnimationConfigsType =
  typeof TourGuideSectionAnimationConfigs;
