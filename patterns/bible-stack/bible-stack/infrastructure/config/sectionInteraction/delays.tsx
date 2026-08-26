import type { SectionInteractionDelay } from "../../../application/ports/out/SectionInteraction";

export const delaysMap: Record<SectionInteractionDelay, number> = {
  UnhighlightSection: 4000,
} as const;
