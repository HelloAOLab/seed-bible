import type { CommunityReadingSpanId } from "@packages/today-screen/todayScreen/domain/models/readingHistory";
import type { Timespan } from "../contexts/socialSection/SocialSectionContext";

export type TimespanOptionId = CommunityReadingSpanId | "all";

export type TimespanOption = {
  year: number;
  timespan: Timespan | undefined;
};

/** Data for a single timespan-filter button in the history card. */
export interface TimespanFilterOptionData {
  label: string;
  id: TimespanOptionId;
  onClick: () => void;
  isSelected: boolean;
}

/**
 * Builds the time-filter options relative to "now" (in seconds). Computed fresh
 * on demand so the windows stay accurate at selection time.
 */
export const buildTimespanOptionsMap = (): Record<
  TimespanOptionId,
  TimespanOption
> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const twoDaysAgo = nowSeconds - 2 * 24 * 60 * 60;
  const aWeekAgo = nowSeconds - 7 * 24 * 60 * 60;
  const aMonthAgo = nowSeconds - 30 * 24 * 60 * 60;

  return {
    twoDays: {
      year: currentYear,
      timespan: { from: twoDaysAgo, to: nowSeconds },
    },
    week: { year: currentYear, timespan: { from: aWeekAgo, to: nowSeconds } },
    month: { year: currentYear, timespan: { from: aMonthAgo, to: nowSeconds } },
    all: { year: currentYear, timespan: undefined },
  };
};

export const TimespanOptionLabelMap: Record<TimespanOptionId, string> = {
  all: "All",
  month: "this-month",
  week: "this-week",
  twoDays: "last-48-hours",
};
