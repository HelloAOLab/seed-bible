export const BookInteractionDelays = {
  UnhighlightOtherSectionBooks: "UnhighlightOtherSectionBooks",
  UnhighlightBook: "UnhighlightBook",
} as const;

export type BookInteractionDelay =
  (typeof BookInteractionDelays)[keyof typeof BookInteractionDelays];

export interface BookInteractionConfigProviderPort {
  getDelay: (delay: BookInteractionDelay) => number;
}
