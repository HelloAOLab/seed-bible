import type {
  TimespanOption,
  TimespanOptionId,
} from "@packages/today-screen/domain/models/readingHistory";

const timespanOptionLabelMap: Record<TimespanOptionId, string> = {
  all: "All",
  month: "this-month",
  week: "this-week",
  twoDays: "last-48-hours",
};

export class ReadingHistoryConfigProvider {
  buildTimespanOptionsMap = (): Record<TimespanOptionId, TimespanOption> => {
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
      month: {
        year: currentYear,
        timespan: { from: aMonthAgo, to: nowSeconds },
      },
      all: { year: currentYear, timespan: undefined },
    };
  };

  getTimespanOptionLabelMap(): Record<TimespanOptionId, string> {
    return timespanOptionLabelMap;
  }
}
