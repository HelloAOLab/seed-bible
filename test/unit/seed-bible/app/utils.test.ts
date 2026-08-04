import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@packages/seed-bible/seed-bible/app/utils";

const NOW = Date.UTC(2026, 5, 17, 12, 0, 0); // 2026-06-17 12:00 UTC
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("picks the largest unit the gap fills at least once", () => {
    expect(formatRelativeTime(NOW - 30 * SECOND, "en", NOW)).toBe(
      "30 seconds ago"
    );
    expect(formatRelativeTime(NOW - 5 * MINUTE, "en", NOW)).toBe(
      "5 minutes ago"
    );
    expect(formatRelativeTime(NOW - 3 * HOUR, "en", NOW)).toBe("3 hours ago");
    expect(formatRelativeTime(NOW - 4 * DAY, "en", NOW)).toBe("4 days ago");
  });

  it("truncates toward zero rather than rounding up", () => {
    // 90 minutes is an hour and a half, and reads as one hour — not two.
    expect(formatRelativeTime(NOW - 90 * MINUTE, "en", NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(NOW - 59 * SECOND, "en", NOW)).toBe(
      "59 seconds ago"
    );
  });

  it("handles future instants", () => {
    expect(formatRelativeTime(NOW + 2 * HOUR, "en", NOW)).toBe("in 2 hours");
    expect(formatRelativeTime(NOW + 10 * DAY, "en", NOW)).toBe("in 10 days");
  });

  it("counts months and years on the calendar", () => {
    // 2026-05-17 is exactly one month back; a day later is not yet a month.
    expect(formatRelativeTime(Date.UTC(2026, 4, 17, 12), "en", NOW)).toBe(
      "1 month ago"
    );
    expect(formatRelativeTime(Date.UTC(2026, 4, 18, 12), "en", NOW)).toBe(
      "30 days ago"
    );
    expect(formatRelativeTime(Date.UTC(2025, 5, 17, 12), "en", NOW)).toBe(
      "1 year ago"
    );
    expect(formatRelativeTime(Date.UTC(2024, 0, 1, 12), "en", NOW)).toBe(
      "2 years ago"
    );
  });

  it("clamps to the month end when the start day is missing from it", () => {
    // February has no 31st, so "a month after Jan 31" is Feb 28 — the gap
    // reads as a whole month even though it is only 28 days.
    expect(
      formatRelativeTime(
        Date.UTC(2026, 0, 31, 12),
        "en",
        Date.UTC(2026, 1, 28, 12)
      )
    ).toBe("1 month ago");
    expect(
      formatRelativeTime(
        Date.UTC(2026, 2, 31, 12),
        "en",
        Date.UTC(2026, 3, 30, 12)
      )
    ).toBe("1 month ago");
    expect(
      formatRelativeTime(
        Date.UTC(2026, 0, 31, 12),
        "en",
        Date.UTC(2026, 3, 30, 12)
      )
    ).toBe("3 months ago");
  });

  it("clamps the same way for future instants", () => {
    // The month count is measured from the earlier instant forward, so the
    // direction must not change the answer — only its sign.
    expect(
      formatRelativeTime(
        Date.UTC(2026, 1, 28, 12),
        "en",
        Date.UTC(2026, 0, 31, 12)
      )
    ).toBe("in 1 month");
    expect(
      formatRelativeTime(
        Date.UTC(2026, 3, 30, 12),
        "en",
        Date.UTC(2026, 2, 31, 12)
      )
    ).toBe("in 1 month");
  });

  it("does not over-apply the clamp within a single month", () => {
    // Jan 1 to Jan 31 is 30 days, not a month — the clamp must not turn a
    // same-month gap into one.
    expect(
      formatRelativeTime(
        Date.UTC(2026, 0, 1, 12),
        "en",
        Date.UTC(2026, 0, 31, 12)
      )
    ).toBe("30 days ago");
    // One day short of a full month still reads in days.
    expect(
      formatRelativeTime(
        Date.UTC(2026, 0, 15, 12),
        "en",
        Date.UTC(2026, 1, 14, 12)
      )
    ).toBe("30 days ago");
  });

  it("reports no elapsed time as zero seconds", () => {
    expect(formatRelativeTime(NOW, "en", NOW)).toBe("in 0 seconds");
  });

  it("renders in the requested locale", () => {
    expect(formatRelativeTime(NOW - 3 * DAY, "es", NOW)).toBe("hace 3 días");
    expect(formatRelativeTime(NOW + 3 * DAY, "de", NOW)).toBe("in 3 Tagen");
  });

  it("falls back to a related locale where CLDR has no data", () => {
    // The app translates Guaraní, but CLDR carries no relative-time data for
    // it, so Intl would silently render English inside an otherwise Guaraní
    // UI. Spanish is co-official with Guaraní in Paraguay.
    expect(formatRelativeTime(NOW - 3 * DAY, "gn", NOW)).toBe("hace 3 días");
    expect(formatRelativeTime(NOW + 2 * HOUR, "gn", NOW)).toBe(
      "dentro de 2 horas"
    );
  });

  it("leaves supported locales untouched by the fallback table", () => {
    expect(formatRelativeTime(NOW - 3 * DAY, "en", NOW)).toBe("3 days ago");
    expect(formatRelativeTime(NOW - 3 * DAY, "es", NOW)).toBe("hace 3 días");
    // A locale with no data and no mapping still degrades to English rather
    // than throwing.
    expect(formatRelativeTime(NOW - 3 * DAY, "zu", NOW)).toEqual(
      expect.any(String)
    );
  });
});
