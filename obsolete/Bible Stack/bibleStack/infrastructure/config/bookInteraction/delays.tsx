export const BookInteractionDelays = {
  UnhighlightOtherSectionBooks: "UnhighlightOtherSectionBooks",
  UnhighlightBook: "UnhighlightBook",
} as const;

export type BookInteractionDelay =
  (typeof BookInteractionDelays)[keyof typeof BookInteractionDelays];

export const delaysMap: Record<BookInteractionDelay, number> = {
  UnhighlightOtherSectionBooks: 7500,
  UnhighlightBook: 2000,
} as const;
