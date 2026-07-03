import {
  GetDayRangeSeconds,
  GetPastDateInfo,
} from "../../../../../packages/seed-bible-utils/domain/functions/time";

// ─── GetDayRangeSeconds ───────────────────────────────────────────────────────

describe("GetDayRangeSeconds", () => {
  it("start is always midnight (00:00:00.000) of the input day in local time", () => {
    const ts = new Date(2024, 0, 15, 14, 30, 0).getTime();
    const { start } = GetDayRangeSeconds(ts);
    const startDate = new Date(start * 1000);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);
    expect(startDate.getMilliseconds()).toBe(0);
  });

  it("end is always 23:59:59 of the input day (milliseconds are floored away)", () => {
    const ts = new Date(2024, 0, 15, 14, 30, 0).getTime();
    const { end } = GetDayRangeSeconds(ts);
    const endDate = new Date(end * 1000);
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
  });

  it("the difference between end and start is always 86399 seconds", () => {
    const ts = new Date(2024, 6, 4, 9, 0, 0).getTime();
    const { start, end } = GetDayRangeSeconds(ts);
    expect(end - start).toBe(86399);
  });

  it("the input timestamp falls within the returned range", () => {
    const ts = new Date(2024, 3, 20, 17, 45, 0).getTime();
    const { start, end } = GetDayRangeSeconds(ts);
    const inputSeconds = Math.floor(ts / 1000);
    expect(inputSeconds).toBeGreaterThanOrEqual(start);
    expect(inputSeconds).toBeLessThanOrEqual(end);
  });

  it("start and end are on the same calendar day as the input", () => {
    const input = new Date(2024, 11, 25, 10, 0, 0);
    const { start, end } = GetDayRangeSeconds(input.getTime());
    expect(new Date(start * 1000).getDate()).toBe(input.getDate());
    expect(new Date(end * 1000).getDate()).toBe(input.getDate());
  });

  it("a timestamp at exactly midnight maps to start of that same day", () => {
    const midnight = new Date(2024, 0, 1, 0, 0, 0, 0).getTime();
    const { start } = GetDayRangeSeconds(midnight);
    expect(start * 1000).toBe(midnight);
  });

  it("a timestamp at 23:59:59.999 maps to end of that same day", () => {
    const almostMidnight = new Date(2024, 0, 1, 23, 59, 59, 999).getTime();
    const { end } = GetDayRangeSeconds(almostMidnight);
    const endDate = new Date(end * 1000);
    expect(endDate.getDate()).toBe(1);
    expect(endDate.getHours()).toBe(23);
  });

  it("returns values in seconds (not milliseconds) — start fits within a reasonable Unix range", () => {
    const ts = new Date(2024, 0, 1).getTime();
    const { start } = GetDayRangeSeconds(ts);
    // Unix seconds for 2024 are around 1.7 billion — 13 digits in ms, 10 in seconds
    expect(start.toString().length).toBeLessThanOrEqual(10);
  });
});

// ─── GetPastDateInfo ──────────────────────────────────────────────────────────

describe("GetPastDateInfo", () => {
  // Jan 7, 2024 is a Sunday (getDay() = 0)
  const jan7 = new Date(2024, 0, 7).getTime();
  // Jul 4, 2024 is a Thursday (getDay() = 4)
  const jul4 = new Date(2024, 6, 4).getTime();
  // Dec 31, 2023 is a Sunday (Jan 1 2024 is Monday, so the day before is Sunday)
  const dec31 = new Date(2023, 11, 31).getTime();

  describe("weekday", () => {
    it("returns 'Sunday' for a Sunday", () => {
      expect(GetPastDateInfo(jan7).weekday).toBe("Sunday");
    });

    it("returns 'Thursday' for a Thursday", () => {
      expect(GetPastDateInfo(jul4).weekday).toBe("Thursday");
    });

    it("returns 'Sunday' for another Sunday (Dec 31 2023)", () => {
      expect(GetPastDateInfo(dec31).weekday).toBe("Sunday");
    });

    it("covers all 7 weekday names in the correct order", () => {
      // Jan 1 2024 = Monday, so Jan 1–7 covers Mon–Sun
      const names = Array.from(
        { length: 7 },
        (_, i) => GetPastDateInfo(new Date(2024, 0, 1 + i).getTime()).weekday
      );
      expect(names).toEqual([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]);
    });
  });

  describe("day", () => {
    it("returns the correct day of the month", () => {
      expect(GetPastDateInfo(jan7).day).toBe(7);
    });

    it("returns 4 for July 4", () => {
      expect(GetPastDateInfo(jul4).day).toBe(4);
    });

    it("returns 31 for December 31", () => {
      expect(GetPastDateInfo(dec31).day).toBe(31);
    });
  });

  describe("month", () => {
    it("returns 1-indexed month — January is 1 (not 0)", () => {
      expect(GetPastDateInfo(jan7).month).toBe(1);
    });

    it("returns 7 for July", () => {
      expect(GetPastDateInfo(jul4).month).toBe(7);
    });

    it("returns 12 for December", () => {
      expect(GetPastDateInfo(dec31).month).toBe(12);
    });
  });

  describe("year", () => {
    it("returns the correct 4-digit year", () => {
      expect(GetPastDateInfo(jan7).year).toBe(2024);
    });

    it("returns 2023 for a date in 2023", () => {
      expect(GetPastDateInfo(dec31).year).toBe(2023);
    });
  });

  describe("monthName", () => {
    it("returns the short month name in en-US by default", () => {
      expect(GetPastDateInfo(jan7).monthName).toBe("Jan");
    });

    it("returns 'Jul' for July", () => {
      expect(GetPastDateInfo(jul4).monthName).toBe("Jul");
    });

    it("returns 'Dec' for December", () => {
      expect(GetPastDateInfo(dec31).monthName).toBe("Dec");
    });
  });

  describe("lang parameter", () => {
    it("uses 'en-US' as the default locale", () => {
      const withDefault = GetPastDateInfo(jan7);
      const withExplicit = GetPastDateInfo(jan7, "en-US");
      expect(withDefault.monthName).toBe(withExplicit.monthName);
    });

    it("only monthName is locale-sensitive — other fields are unaffected by lang", () => {
      const result = GetPastDateInfo(jul4, "es-ES");
      expect(result.day).toBe(4);
      expect(result.month).toBe(7);
      expect(result.year).toBe(2024);
      expect(result.weekday).toBe("Thursday");
    });
  });
});
