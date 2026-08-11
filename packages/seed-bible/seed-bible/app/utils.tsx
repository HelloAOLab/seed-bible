import type { TranslatableTitle } from "../managers/BibleToolsManager";

/**
 * Translates a TranslatableTitle using the provided translation function.
 * @param t The translation function.
 * @param title The title to translate.
 * @returns The translated title string.
 */
export const translateTitle = (
  t: (key: string, options?: Record<string, unknown>) => string,
  title: TranslatableTitle
): string => {
  if (typeof title === "string") {
    return title;
  }
  return t(title.key, {
    defaultValue: title.defaultValue,
    ns: title.ns,
    ...title.options,
  });
};

/**
 * How many whole calendar months separate two instants, signed and truncated
 * toward zero. Calendar-aware rather than "every month is 30 days", so
 * Jan 31 → Feb 28 counts as a whole month and Jan 1 → Jan 31 counts as none.
 */
function wholeMonthsBetween(fromMs: number, toMs: number): number {
  // Always measure from the earlier instant forward, then re-apply the sign.
  // Measuring backward from the later one is not symmetric: Feb 28 minus a
  // month is Jan 28, which is earlier than Jan 31 and would drop the month,
  // while Jan 31 forward correctly reaches Feb 28.
  const sign = toMs >= fromMs ? 1 : -1;
  const earlier = new Date(Math.min(fromMs, toMs));
  const laterMs = Math.max(fromMs, toMs);
  const later = new Date(laterMs);

  let months =
    (later.getFullYear() - earlier.getFullYear()) * 12 +
    (later.getMonth() - earlier.getMonth());

  // The calendar delta above rounds outward — Jan 31 to Feb 1 reads as one
  // month. Step back toward zero when less than a full month has elapsed.
  if (months > 0) {
    const anchor = new Date(earlier.getTime());
    const wantedMonth = (((anchor.getMonth() + months) % 12) + 12) % 12;
    anchor.setMonth(anchor.getMonth() + months);
    // `setMonth` overflows when the day is missing from the target month —
    // Jan 31 plus one month lands on Mar 3. Clamp back to that month's last
    // day so Jan 31 → Feb 28 stays the whole month it reads as.
    if (anchor.getMonth() !== wantedMonth) {
      anchor.setDate(0);
    }
    if (anchor.getTime() > laterMs) {
      months -= 1;
    }
  }
  return months * sign;
}

/**
 * Locales the app translates but CLDR has no relative-time data for, mapped to
 * the nearest locale it does cover. Left alone, `Intl` falls back to English,
 * which strands an English "3 days ago" in an otherwise translated UI. Guaraní
 * is co-official with Spanish in Paraguay, where nearly all of its speakers
 * are, so Spanish reads far less foreign to them than English.
 */
const RELATIVE_TIME_LOCALE_FALLBACKS: Record<string, string> = { gn: "es" };

function resolveRelativeTimeLocale(locale: string): string {
  const fallback = RELATIVE_TIME_LOCALE_FALLBACKS[locale];
  // The mapping only applies when the platform genuinely lacks the locale, so
  // this corrects itself if CLDR gains data later.
  if (
    fallback &&
    Intl.RelativeTimeFormat.supportedLocalesOf([locale]).length === 0
  ) {
    return fallback;
  }
  return locale;
}

/**
 * Formatters are immutable and comparatively expensive to build — around 35x
 * the cost of a format call — and the reader rebuilds every visible timestamp
 * on a 15-second timer, so they are kept per locale. Keyed by the requested
 * locale rather than the resolved one, so the fallback lookup above is paid
 * once too. Bounded by the number of UI languages, the same as the time-zone
 * cache in `managers/civilDate.ts`.
 */
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function getRelativeTimeFormatter(locale: string): Intl.RelativeTimeFormat {
  let formatter = relativeTimeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(resolveRelativeTimeLocale(locale), {
      numeric: "always",
    });
    relativeTimeFormatters.set(locale, formatter);
  }
  return formatter;
}

/** Fixed-length units, largest first, used below the one-month threshold. */
const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1_000],
];

/**
 * Renders an instant relative to now — "3 minutes ago", "in 2 days".
 *
 * Picks the largest unit that the gap fills at least once and truncates toward
 * zero, so 90 minutes reads as "1 hour ago" rather than "2 hours ago". Years
 * and months are counted on the calendar; everything below them uses
 * fixed-length units.
 *
 * @param timeMs The instant to describe.
 * @param locale The BCP 47 locale to render in.
 * @param nowMs The instant to compare against. Defaults to now; pass a value
 *              to keep tests deterministic.
 */
export const formatRelativeTime = (
  timeMs: number,
  locale: string,
  nowMs: number = Date.now()
): string => {
  const format = getRelativeTimeFormatter(locale);

  const months = wholeMonthsBetween(nowMs, timeMs);
  const years = Math.trunc(months / 12);
  if (years !== 0) {
    return format.format(years, "year");
  }
  if (months !== 0) {
    return format.format(months, "month");
  }

  const deltaMs = timeMs - nowMs;
  for (const [unit, unitMs] of RELATIVE_TIME_UNITS) {
    const value = Math.trunc(deltaMs / unitMs);
    if (value !== 0) {
      return format.format(value, unit);
    }
  }
  return format.format(0, "second");
};

export const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.addEventListener("click", function (e) {
    e.stopPropagation();
    this.removeEventListener("click", arguments.callee as EventListener);
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
