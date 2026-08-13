/**
 * Reading-history time helpers.
 *
 * These work on machine-local instants (`Date#setHours`, `Date#getDay`), which
 * is deliberately different from `civilDate.ts` — that file is built on "never
 * do arithmetic on instants" and is IANA-zone correct. It is also different
 * from `ReadingHistoryManager`'s `getTodayTimeSpan()`, which is UTC-based and
 * only ever describes *now*. Keep the distinction in mind before substituting
 * one for another: `GetDayRangeSeconds` is the only one of the three that
 * answers "the local day containing this timestamp".
 */

type Range = {
  start: number;
  end: number;
};

export type GetDayRangeSecondsType = (timestamp: number) => Range;
export type GetPastDateInfoType = (
  time: number,
  lang?: string
) => {
  weekday: string | undefined;
  day: number;
  month: number;
  monthName: string;
  year: number;
};

export const GetDayRangeSeconds: GetDayRangeSecondsType = (timestamp) => {
  const date = new Date(timestamp);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
};

export const GetPastDateInfo: GetPastDateInfoType = (time, lang = "en-US") => {
  const date = new Date(time);

  // `weekday` is hardcoded English and is not read by any current consumer —
  // `monthName` below is the localized one. Don't start using `weekday` without
  // replacing this with an Intl-based lookup.
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthName = date.toLocaleString(lang, { month: "short" });

  return { weekday, day, month, monthName, year };
};
