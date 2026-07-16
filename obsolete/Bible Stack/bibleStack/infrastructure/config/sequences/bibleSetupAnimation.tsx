export const BibleSetupAnimationConfig = {
  duration: 1,
  zoom: 8,
  positionZ: 2,
  rotationX: 1.01229,
  rotationY: 0.5,
  easingType: "sinusoidal",
  easingMode: "inout",
} as const;

export type BibleSetupAnimationConfig = typeof BibleSetupAnimationConfig;
