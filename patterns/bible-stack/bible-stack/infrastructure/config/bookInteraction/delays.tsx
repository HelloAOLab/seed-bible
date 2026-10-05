import type { BookInteractionDelay } from "../../../application/ports/out/BookInteractionConfigProvider";

export const delaysMap: Record<BookInteractionDelay, number> = {
  UnhighlightOtherSectionBooks: 7500,
  UnhighlightBook: 2000,
} as const;
