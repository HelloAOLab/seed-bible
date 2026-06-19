export const StackUpdatePacings = {
  Fast: "Fast",
  Regular: "Regular",
  Slow: "Slow",
  Instant: "Instant",
} as const;

export type StackUpdatePacing =
  (typeof StackUpdatePacings)[keyof typeof StackUpdatePacings];
