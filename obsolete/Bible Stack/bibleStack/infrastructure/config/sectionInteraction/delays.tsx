export const SectionInteractionDelays = {
  UnhighlightSection: "UnhighlightSection",
} as const;

export type SectionInteractionDelay =
  (typeof SectionInteractionDelays)[keyof typeof SectionInteractionDelays];

export const delaysMap: Record<SectionInteractionDelay, number> = {
  UnhighlightSection: 4000,
} as const;
