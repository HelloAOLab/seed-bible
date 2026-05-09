export const StackPresenceNavigationPacings = {
  Regular: "Regular",
  Double: "Double",
} as const;

export type StackPresenceNavigationPacing =
  (typeof StackPresenceNavigationPacings)[keyof typeof StackPresenceNavigationPacings];
