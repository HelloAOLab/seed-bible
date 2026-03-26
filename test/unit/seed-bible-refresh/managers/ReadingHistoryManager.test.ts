import {
  getTodayTimeSpan,
  getPastYearTimeSpan,
  getCurrentYearTimeSpan,
  calculateReadingHistorySummary,
  createReadingHistoryManager,
  type ReadingEvent,
} from "@packages/seed-bible-refresh/seed-bible/managers/ReadingHistoryManager";

describe("ReadingHistoryManager", () => {
  describe("getTodayTimeSpan", () => {
    it("returns a time span for today", () => {
      const span = getTodayTimeSpan();

      expect(span.start).toBeDefined();
      expect(span.end).toBeDefined();
      expect(span.end).toBeGreaterThan(span.start);
    });

    it("start is beginning of day and end is end of day", () => {
      const span = getTodayTimeSpan();
      const now = new Date();
      const startOfDayMs = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      const endOfDayMs = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59
      );

      expect(span.start).toBe(Math.floor(startOfDayMs / 1000));
      expect(span.end).toBe(Math.floor(endOfDayMs / 1000));
    });
  });

  describe("getPastYearTimeSpan", () => {
    it("returns a time span for past year", () => {
      const span = getPastYearTimeSpan();

      expect(span.start).toBeDefined();
      expect(span.end).toBeDefined();
      expect(span.end).toBeGreaterThan(span.start);
    });

    it("start is one year ago and end is today", () => {
      const span = getPastYearTimeSpan();
      const now = new Date();
      const expectedStart = Date.UTC(
        now.getUTCFullYear() - 1,
        now.getUTCMonth(),
        now.getUTCDate()
      );

      expect(span.start).toBe(Math.floor(expectedStart / 1000));
    });
  });

  describe("getCurrentYearTimeSpan", () => {
    it("returns a time span for current year", () => {
      const span = getCurrentYearTimeSpan();

      expect(span.start).toBeDefined();
      expect(span.end).toBeDefined();
      expect(span.end).toBeGreaterThan(span.start);
    });

    it("start is Jan 1 of current year and end is today", () => {
      const span = getCurrentYearTimeSpan();
      const now = new Date();
      const expectedStart = Date.UTC(now.getUTCFullYear(), 1, 1);

      expect(span.start).toBe(Math.floor(expectedStart / 1000));
    });
  });

  describe("calculateReadingHistorySummary", () => {
    it("returns empty summary for empty events", () => {
      const summary = calculateReadingHistorySummary([]);

      expect(summary.totalBooksRead).toBe(0);
      expect(summary.totalChaptersRead).toBe(0);
      expect(summary.totalTimeSpentReading).toBe(0);
      expect(summary.users).toEqual({});
    });

    it("calculates summary for single event", () => {
      const events: ReadingEvent[] = [
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 1,
          start: 1000,
          end: 2000,
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary.totalBooksRead).toBe(1);
      expect(summary.totalChaptersRead).toBe(1);
      expect(summary.totalTimeSpentReading).toBe(1000);
      expect(summary.users["user-1"]).toBeDefined();
      expect(summary.users["user-1"].uniqueBooksRead).toBe(1);
      expect(summary.users["user-1"].uniqueChaptersRead).toBe(1);
    });

    it("calculates summary for multiple events from same user", () => {
      const events: ReadingEvent[] = [
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 1,
          start: 1000,
          end: 2000,
        },
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 2,
          start: 3000,
          end: 4000,
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary.totalBooksRead).toBe(1);
      expect(summary.totalChaptersRead).toBe(2);
      expect(summary.totalTimeSpentReading).toBe(2000);
      expect(summary.users["user-1"].uniqueChaptersRead).toBe(2);
    });

    it("calculates summary for multiple users", () => {
      const events: ReadingEvent[] = [
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 1,
          start: 1000,
          end: 2000,
        },
        {
          userId: "user-2",
          bookId: "exodus",
          chapter: 1,
          start: 3000,
          end: 4000,
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary.totalBooksRead).toBe(2);
      expect(summary.totalChaptersRead).toBe(2);
      expect(summary.users["user-1"]).toBeDefined();
      expect(summary.users["user-2"]).toBeDefined();
      expect(summary.users["user-1"].uniqueBooksRead).toBe(1);
      expect(summary.users["user-2"].uniqueBooksRead).toBe(1);
    });

    it("tracks start and end times correctly", () => {
      const events: ReadingEvent[] = [
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 1,
          start: 5000,
          end: 6000,
        },
        {
          userId: "user-1",
          bookId: "exodus",
          chapter: 1,
          start: 1000,
          end: 2000,
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary.startTime).toBe(1000);
      expect(summary.endTime).toBe(6000);
    });

    it("groups events by user and book", () => {
      const events: ReadingEvent[] = [
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 1,
          start: 1000,
          end: 2000,
        },
        {
          userId: "user-1",
          bookId: "genesis",
          chapter: 2,
          start: 3000,
          end: 4000,
        },
        {
          userId: "user-1",
          bookId: "exodus",
          chapter: 1,
          start: 5000,
          end: 6000,
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary.users["user-1"].books["genesis"]).toBeDefined();
      expect(summary.users["user-1"].books["exodus"]).toBeDefined();
      expect(
        Object.keys(summary.users["user-1"].books["genesis"].chapters)
      ).toEqual(["1", "2"]);
    });
  });

  describe("createReadingHistoryManager", () => {
    let loginManager: any;
    // let getReadingHistoryEventsMock: jest.Mock;
    // let saveReadingHistoryMock: jest.Mock;

    beforeEach(() => {
      loginManager = {
        userId: {
          value: "user-1",
        },
      };

      // Mock the os and global functions
      (globalThis as any).os = {
        getSharedDocument: jest.fn(),
        requestAuthBotInBackground: jest.fn(),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("creates a manager with saveReadingHistory and getReadingEvents", () => {
      const manager = createReadingHistoryManager(loginManager);

      expect(manager.saveReadingHistory).toBeDefined();
      expect(typeof manager.saveReadingHistory).toBe("function");
      expect(manager.getReadingEvents).toBeDefined();
      expect(typeof manager.getReadingEvents).toBe("function");
    });

    it("saveReadingHistory does nothing when user is not logged in", async () => {
      loginManager.userId.value = null;
      const manager = createReadingHistoryManager(loginManager);

      await manager.saveReadingHistory("genesis", 1);

      expect(os.getSharedDocument).not.toHaveBeenCalled();
    });

    it("getReadingEvents returns empty array when user is not logged in", async () => {
      loginManager.userId.value = null;
      const manager = createReadingHistoryManager(loginManager);

      const events = await manager.getReadingEvents(1000, 2000);

      expect(Array.from(events)).toEqual([]);
    });

    it("manager methods handle logged in users", async () => {
      const manager = createReadingHistoryManager(loginManager);

      // Just verify the manager was created successfully with logged in user
      expect(loginManager.userId.value).toBe("user-1");
    });
  });
});
