export const ShowAnimationPacings = {
  Slow: "Slow",
  Regular: "Regular",
  Fast: "Fast",
  Instant: "Instant",
} as const;

export type ShowAnimationPacing = keyof typeof ShowAnimationPacings;
