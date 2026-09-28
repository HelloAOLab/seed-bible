export const SectionInteractionDelays = {
  UnhighlightSection: "UnhighlightSection",
} as const;

export type SectionInteractionDelay =
  (typeof SectionInteractionDelays)[keyof typeof SectionInteractionDelays];

export interface SectionInteractionConfigProviderPort {
  getDelay: (delay: SectionInteractionDelay) => number;
}
