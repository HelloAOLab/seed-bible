import type { SectionInteractionDelay } from "../../../application/ports/out/SectionInteractionConfigProvider";

export const delaysMap: Record<SectionInteractionDelay, number> = {
  UnhighlightSection: 4000,
} as const;
