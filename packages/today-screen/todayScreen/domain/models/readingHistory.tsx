export interface FilteredReading {
  [bookId: string]: {
    [chapter: number]: string[];
  };
}

export type CommunityReading<T extends string> = {
  [K in T]: FilteredReading;
};

export const COMMUNITY_READING_SPAN_IDS = {
  twoDays: "twoDays",
  week: "week",
  month: "month",
} as const;
export type CommunityReadingSpanId =
  (typeof COMMUNITY_READING_SPAN_IDS)[keyof typeof COMMUNITY_READING_SPAN_IDS];

export type UserLastReading = { bookId: string; chapter: number } | undefined;
