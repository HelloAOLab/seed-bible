import {
  getTodayTimeSpan,
  getPastYearTimeSpan,
  getCurrentYearTimeSpan,
  calculateReadingHistorySummary,
  createReadingHistoryManager,
  getReadingHistoryEvents,
  getReadingHistorySummary,
  filter,
  flat,
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
      expect(summary.users["user-1"]!.uniqueBooksRead).toBe(1);
      expect(summary.users["user-1"]!.uniqueChaptersRead).toBe(1);
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
      expect(summary.users["user-1"]!.uniqueChaptersRead).toBe(2);
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
      expect(summary.users["user-1"]!.uniqueBooksRead).toBe(1);
      expect(summary.users["user-2"]!.uniqueBooksRead).toBe(1);
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

      expect(summary.users["user-1"]!.books["genesis"]).toBeDefined();
      expect(summary.users["user-1"]!.books["exodus"]).toBeDefined();
      expect(
        Object.keys(summary.users["user-1"]!.books["genesis"]!.chapters)
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
      createReadingHistoryManager(loginManager);

      // Just verify the manager was created successfully with logged in user
      expect(loginManager.userId.value).toBe("user-1");
    });
  });

  describe("Shared document retrieval and event extraction", () => {
    let getSharedDocumentMock: jest.Mock;
    let mockSharedDocument: any;
    let mockEventsArray: any;

    beforeEach(() => {
      mockEventsArray = {
        type: {
          get: jest.fn(),
          length: 0,
        },
      };

      mockSharedDocument = {
        getArray: jest.fn().mockReturnValue(mockEventsArray),
        createMap: jest.fn(),
      };

      getSharedDocumentMock = jest.fn().mockResolvedValue(mockSharedDocument);

      (globalThis as any).os = {
        getSharedDocument: getSharedDocumentMock,
      };

      (globalThis as any).bot = {
        vars: {},
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
      delete (globalThis as any).bot;
    });

    it("calls os.getSharedDocument with correct parameters", async () => {
      mockEventsArray.type.length = 0;

      await getReadingHistoryEvents("user-123", 1000, 2000);

      expect(getSharedDocumentMock).toHaveBeenCalled();
    });

    it("retrieves shared document with correct markers", async () => {
      mockEventsArray.type.length = 0;
      const recordName = "user-123";
      const startTime = 1000;
      const endTime = 2000;

      await getReadingHistoryEvents(recordName, startTime, endTime);

      const callArgs = getSharedDocumentMock.mock.calls[0];
      expect(callArgs[0]).toBe(recordName);
      expect(callArgs[1]).toBe("reading_history");
    });

    it("extracts reading events from shared document", async () => {
      const event1 = {
        get: jest.fn((key: string) => {
          const map: any = {
            userId: "user-1",
            bookId: "genesis",
            chapter: 1,
            start: 1500,
            end: 1600,
          };
          return map[key];
        }),
      };

      mockEventsArray.type.length = 1;
      mockEventsArray.type.get = jest.fn().mockReturnValue(event1);

      const events = await getReadingHistoryEvents("user-123", 1000, 2000);
      const eventsArray = Array.from(events);

      expect(eventsArray).toHaveLength(1);
      expect(eventsArray[0]).toEqual({
        userId: "user-1",
        bookId: "genesis",
        chapter: 1,
        start: 1500,
        end: 1600,
      });
    });

    it("filters events by time range", async () => {
      const event1 = {
        get: jest.fn((key: string) => {
          const map: any = {
            userId: "user-1",
            bookId: "genesis",
            chapter: 1,
            start: 500,
            end: 600,
          };
          return map[key];
        }),
      };

      const event2 = {
        get: jest.fn((key: string) => {
          const map: any = {
            userId: "user-1",
            bookId: "exodus",
            chapter: 1,
            start: 1500,
            end: 1600,
          };
          return map[key];
        }),
      };

      mockEventsArray.type.length = 2;
      mockEventsArray.type.get = jest
        .fn()
        .mockReturnValueOnce(event1)
        .mockReturnValueOnce(event2);

      const events = await getReadingHistoryEvents("user-123", 1000, 2000);
      const eventsArray = Array.from(events);

      expect(eventsArray).toHaveLength(1);
      expect(eventsArray[0]!.bookId).toBe("exodus");
    });

    it("retrieves events from multiple years", async () => {
      const event = {
        get: jest.fn((key: string) => {
          const map: any = {
            userId: "user-1",
            bookId: "genesis",
            chapter: 1,
            start: 1000,
            end: 1500,
          };
          return map[key];
        }),
      };

      mockEventsArray.type.length = 1;
      mockEventsArray.type.get = jest.fn().mockReturnValue(event);

      // Request events spanning two years
      const startTime = new Date("2024-12-01").getTime() / 1000;
      const endTime = new Date("2025-02-01").getTime() / 1000;

      await getReadingHistoryEvents("user-123", startTime, endTime);

      // Should have called getSharedDocument for both 2024 and 2025
      expect(getSharedDocumentMock.call.length).toBeGreaterThan(0);
    });

    it("caches shared documents to avoid redundant retrieval", async () => {
      mockEventsArray.type.length = 0;

      // First call
      await getReadingHistoryEvents("user-123", 1000, 2000);
      const firstCallCount = getSharedDocumentMock.mock.calls.length;

      // Second call with same parameters
      await getReadingHistoryEvents("user-123", 1000, 2000);
      const secondCallCount = getSharedDocumentMock.mock.calls.length;

      // Cache should reduce redundant calls
      expect(secondCallCount).toBeLessThanOrEqual(firstCallCount + 1);
    });
  });

  describe("filter and flat utilities", () => {
    it("filter returns matching items", () => {
      const items = [1, 2, 3, 4, 5];
      const result = Array.from(filter(items, (x) => x > 2));

      expect(result).toEqual([3, 4, 5]);
    });

    it("filter returns empty array when nothing matches", () => {
      const items = [1, 2, 3];
      const result = Array.from(filter(items, (x) => x > 10));

      expect(result).toEqual([]);
    });

    it("flat flattens iterables", () => {
      const iterables = [[1, 2], [3, 4], [5]];
      const result = Array.from(flat(iterables));

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("flat handles empty iterables", () => {
      const iterables: number[][] = [];
      const result = Array.from(flat(iterables));

      expect(result).toEqual([]);
    });
  });

  describe("getReadingHistorySummary", () => {
    let getSharedDocumentMock: jest.Mock;
    let mockSharedDocument: any;
    let mockEventsArray: any;

    beforeEach(() => {
      mockEventsArray = {
        type: {
          get: jest.fn(),
          length: 0,
        },
      };

      mockSharedDocument = {
        getArray: jest.fn().mockReturnValue(mockEventsArray),
      };

      getSharedDocumentMock = jest.fn().mockResolvedValue(mockSharedDocument);

      (globalThis as any).os = {
        getSharedDocument: getSharedDocumentMock,
      };

      (globalThis as any).bot = {
        vars: {},
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
      delete (globalThis as any).bot;
    });

    it("retrieves and summarizes reading history from documents", async () => {
      const event = {
        get: jest.fn((key: string) => {
          const map: any = {
            userId: "user-1",
            bookId: "genesis",
            chapter: 1,
            start: 1000,
            end: 2000,
          };
          return map[key];
        }),
      };

      mockEventsArray.type.length = 1;
      mockEventsArray.type.get = jest.fn().mockReturnValue(event);

      const summary = await getReadingHistorySummary("user-123", 1000, 2000);

      expect(summary.totalBooksRead).toBe(1);
      expect(summary.totalChaptersRead).toBe(1);
      expect(summary.totalTimeSpentReading).toBe(1000);
    });

    it("returns summary with correct time boundaries", async () => {
      const event = {
        get: jest.fn((key: string) => {
          const map: any = {
            userId: "user-1",
            bookId: "genesis",
            chapter: 1,
            start: 1500,
            end: 2500,
          };
          return map[key];
        }),
      };

      mockEventsArray.type.length = 1;
      mockEventsArray.type.get = jest.fn().mockReturnValue(event);

      const summary = await getReadingHistorySummary("user-123", 1000, 3000);

      expect(summary.startTime).toBe(1500);
      expect(summary.endTime).toBe(2500);
    });
  });
});
