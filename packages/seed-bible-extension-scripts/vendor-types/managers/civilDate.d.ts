/**
 * Calendar-date arithmetic that is correct across time zones and daylight
 * saving, without pulling a date library into the bundle.
 *
 * The trick is to never do arithmetic on instants. "Three days after the plan
 * started" is a question about a wall calendar, and calendars have no DST — the
 * day after March 8th is March 9th whether or not the clocks moved overnight.
 * So we resolve an instant to the calendar date a person in some time zone
 * would see (`civilDateInZone`), do all the adding and subtracting on that
 * date, and never convert back. Doing the same thing with milliseconds would
 * drift by an hour twice a year.
 */
/** A date on the wall calendar, with no time and no time zone attached. */
export interface CivilDate {
  /** Full year, e.g. 2026. */
  year: number;
  /** Month of the year, 1-12. */
  month: number;
  /** Day of the month, 1-31. */
  day: number;
}
/** The calendar date someone in `timeZone` sees at the instant `ms`. */
export declare function civilDateInZone(
  ms: number,
  timeZone?: string | null
): CivilDate;
/**
 * A date as a count of days since 1970-01-01. UTC has no daylight saving, so
 * this is exact integer arithmetic and round-trips through `dayNumberToCivil`.
 */
export declare function civilToDayNumber(date: CivilDate): number;
/** Inverse of {@link civilToDayNumber}. */
export declare function dayNumberToCivil(dayNumber: number): CivilDate;
/** `date` moved forward (or back, for a negative `days`) on the calendar. */
export declare function addCivilDays(date: CivilDate, days: number): CivilDate;
/** Whole days from `from` to `to`; negative when `to` is earlier. */
export declare function civilDaysBetween(
  from: CivilDate,
  to: CivilDate
): number;
/** The date as `YYYY-MM-DD`, for display, keys, and test assertions. */
export declare function civilDateToISO(date: CivilDate): string;
