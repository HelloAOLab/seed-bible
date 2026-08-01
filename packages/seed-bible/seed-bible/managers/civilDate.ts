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

const MS_PER_DAY = 86_400_000;

/**
 * `Intl.DateTimeFormat` construction is comparatively expensive and these are
 * immutable, so one is kept per time zone.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      // `undefined` means "the machine's zone", matching the previous
      // behaviour when a reading plan has no time zone recorded.
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      era: "narrow",
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** The calendar date someone in `timeZone` sees at the instant `ms`. */
export function civilDateInZone(
  ms: number,
  timeZone?: string | null
): CivilDate {
  const parts = getFormatter(timeZone ?? undefined).formatToParts(new Date(ms));
  let year = 0;
  let month = 1;
  let day = 1;
  let isBce = false;
  for (const part of parts) {
    if (part.type === "year") {
      year = Number(part.value);
    } else if (part.type === "month") {
      month = Number(part.value);
    } else if (part.type === "day") {
      day = Number(part.value);
    } else if (part.type === "era") {
      // Intl reports year 1 BCE as "1 B", not 0, so the era is needed to map
      // back onto the proleptic numbering the rest of this module uses.
      isBce = part.value.startsWith("B");
    }
  }
  return { year: isBce ? 1 - year : year, month, day };
}

/**
 * The UTC instant of midnight on `date`. Only used as a stable integer
 * representation for day arithmetic — it is deliberately *not* the real
 * instant that day began in any particular zone.
 */
function utcMidnightMs(date: CivilDate): number {
  const ms = Date.UTC(date.year, date.month - 1, date.day);
  if (date.year >= 0 && date.year < 100) {
    // `Date.UTC` maps two-digit years into 1900-1999; undo that.
    const corrected = new Date(ms);
    corrected.setUTCFullYear(date.year);
    return corrected.getTime();
  }
  return ms;
}

/**
 * A date as a count of days since 1970-01-01. UTC has no daylight saving, so
 * this is exact integer arithmetic and round-trips through `dayNumberToCivil`.
 */
export function civilToDayNumber(date: CivilDate): number {
  return Math.round(utcMidnightMs(date) / MS_PER_DAY);
}

/** Inverse of {@link civilToDayNumber}. */
export function dayNumberToCivil(dayNumber: number): CivilDate {
  const date = new Date(dayNumber * MS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** `date` moved forward (or back, for a negative `days`) on the calendar. */
export function addCivilDays(date: CivilDate, days: number): CivilDate {
  return dayNumberToCivil(civilToDayNumber(date) + days);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function civilDaysBetween(from: CivilDate, to: CivilDate): number {
  return civilToDayNumber(to) - civilToDayNumber(from);
}

/** The date as `YYYY-MM-DD`, for display, keys, and test assertions. */
export function civilDateToISO(date: CivilDate): string {
  const year =
    date.year < 0
      ? `-${String(-date.year).padStart(6, "0")}`
      : String(date.year).padStart(4, "0");
  return `${year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
