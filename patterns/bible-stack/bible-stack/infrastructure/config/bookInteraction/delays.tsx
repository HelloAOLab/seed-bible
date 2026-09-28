import type { BookInteractionDelay } from "../../../application/ports/out/BookInteraction";

export const delaysMap: Record<BookInteractionDelay, number> = {
  UnhighlightOtherSectionBooks: 7500,
  UnhighlightBook: 2000,
} as const;
