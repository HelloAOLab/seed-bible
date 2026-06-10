import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
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
} from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { Mock } from "vitest";

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
    let os: CasualOSManager;
    let eventsType: { get: Mock; length: number };
    let eventsArray: {
      type: { get: Mock; length: number };
      push: Mock;
    };
    let createMapSetMock: Mock;
    let getSharedDocumentMock: Mock;

    beforeEach(() => {
      os = CasualOSManager();
      loginManager = {
        userId: {
          value: "user-1",
        },
      };

      createMapSetMock = vi.fn();
      eventsType = {
        get: vi.fn(),
        length: 0,
      };
      eventsArray = {
        type: eventsType,
        push: vi.fn(),
      };
      getSharedDocumentMock = vi.fn().mockResolvedValue({
        getArray: vi.fn().mockReturnValue(eventsArray),
        createMap: vi.fn().mockReturnValue({
          set: createMapSetMock,
        }),
      });

      // Mock the os and global functions
      (globalThis as any).os = {
        getSharedDocument: getSharedDocumentMock,
        requestAuthBotInBackground: vi.fn(),
      };

      (globalThis as any).bot = {
        vars: {},
      };

      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.useRealTimers();
      delete (globalThis as any).bot;
    });

    it("creates a manager with saveReadingHistory and getReadingEvents", () => {
      const manager = createReadingHistoryManager(os, loginManager);

      expect(manager.saveReadingHistory).toBeDefined();
      expect(typeof manager.saveReadingHistory).toBe("function");
      expect(manager.getReadingEvents).toBeDefined();
      expect(typeof manager.getReadingEvents).toBe("function");
    });

    it("saveReadingHistory does nothing when user is not logged in", async () => {
      loginManager.userId.value = null;
      const manager = createReadingHistoryManager(os, loginManager);

      manager.saveReadingHistory("genesis", 1);
      await vi.advanceTimersByTimeAsync(300);

      expect(os.getSharedDocument).not.toHaveBeenCalled();
    });

    it("saves reading history to the document when logged in", async () => {
      const manager = createReadingHistoryManager(os, loginManager);

      manager.saveReadingHistory("genesis", 3);
      await vi.advanceTimersByTimeAsync(300);

      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1);
      expect(eventsArray.push).toHaveBeenCalledTimes(1);
      expect(createMapSetMock).toHaveBeenCalledWith("userId", "user-1");
      expect(createMapSetMock).toHaveBeenCalledWith("bookId", "genesis");
      expect(createMapSetMock).toHaveBeenCalledWith("chapter", 3);
      expect(createMapSetMock).toHaveBeenCalledWith(
        "start",
        expect.any(Number)
      );
      expect(createMapSetMock).toHaveBeenCalledWith("end", expect.any(Number));
    });

    it("getReadingEvents returns empty array when user is not logged in", async () => {
      loginManager.userId.value = null;
      const manager = createReadingHistoryManager(os, loginManager);

      const events = await manager.getReadingEvents(1000, 2000);

      expect(Array.from(events)).toEqual([]);
    });

    it("returns events between start and end time when logged in", async () => {
      const manager = createReadingHistoryManager(os, loginManager);
      eventsType.length = 3;
      eventsType.get
        .mockReturnValueOnce({
          get: (key: string) =>
            ({
              userId: "user-1",
              bookId: "genesis",
              chapter: 1,
              start: 900,
              end: 950,
            })[key],
        })
        .mockReturnValueOnce({
          get: (key: string) =>
            ({
              userId: "user-1",
              bookId: "genesis",
              chapter: 2,
              start: 1200,
              end: 1250,
            })[key],
        })
        .mockReturnValueOnce({
          get: (key: string) =>
            ({
              userId: "user-1",
              bookId: "exodus",
              chapter: 1,
              start: 1800,
              end: 1850,
            })[key],
        });

      const events = await manager.getReadingEvents(1000, 1700);
      const result = Array.from(events);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: "user-1",
        bookId: "genesis",
        chapter: 2,
        start: 1200,
        end: 1250,
      });
    });
  });

  describe("Shared document retrieval and event extraction", () => {
    let getSharedDocumentMock: Mock;
    let mockSharedDocument: any;
    let mockEventsArray: any;
    let os: CasualOSManager;

    beforeEach(() => {
      os = CasualOSManager();
      mockEventsArray = {
        type: {
          get: vi.fn(),
          length: 0,
        },
      };

      mockSharedDocument = {
        getArray: vi.fn().mockReturnValue(mockEventsArray),
        createMap: vi.fn(),
      };

      getSharedDocumentMock = vi
        .spyOn(os, "getSharedDocument")
        .mockResolvedValue(mockSharedDocument);
    });

    afterEach(() => {
      vi.clearAllMocks();
      delete (globalThis as any).bot;
    });

    it("calls os.getSharedDocument with correct parameters", async () => {
      mockEventsArray.type.length = 0;

      await getReadingHistoryEvents(os, "user-123", 1000, 2000);

      expect(getSharedDocumentMock).toHaveBeenCalled();
    });

    it("retrieves shared document with correct markers", async () => {
      mockEventsArray.type.length = 0;
      const recordName = "user-123";
      const startTime = 1000;
      const endTime = 2000;

      await getReadingHistoryEvents(os, recordName, startTime, endTime);

      expect(getSharedDocumentMock).toHaveBeenNthCalledWith(
        1,
        recordName,
        "reading_history",
        "1970",
        {
          markers: ["publicRead:reading_history/1970"],
        }
      );
    });

    it("extracts reading events from shared document", async () => {
      const event1 = {
        get: vi.fn((key: string) => {
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
      mockEventsArray.type.get = vi.fn().mockReturnValue(event1);

      const events = await getReadingHistoryEvents(os, "user-123", 1000, 2000);
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
        get: vi.fn((key: string) => {
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
        get: vi.fn((key: string) => {
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
      mockEventsArray.type.get = vi
        .fn()
        .mockReturnValueOnce(event1)
        .mockReturnValueOnce(event2);

      const events = await getReadingHistoryEvents(os, "user-123", 1000, 2000);
      const eventsArray = Array.from(events);

      expect(eventsArray).toHaveLength(1);
      expect(eventsArray[0]!.bookId).toBe("exodus");
    });

    it("retrieves events from multiple years", async () => {
      const event = {
        get: vi.fn((key: string) => {
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
      mockEventsArray.type.get = vi.fn().mockReturnValue(event);

      // Request events spanning two years
      const startTime = new Date("2024-12-01").getTime() / 1000;
      const endTime = new Date("2025-02-01").getTime() / 1000;

      await getReadingHistoryEvents(os, "user-123", startTime, endTime);

      // Should have called getSharedDocument for both 2024 and 2025
      expect(getSharedDocumentMock).toHaveBeenCalledTimes(2);
      expect(getSharedDocumentMock).toHaveBeenCalledWith(
        "user-123",
        "reading_history",
        "2024",
        {
          markers: ["publicRead:reading_history/2024"],
        }
      );
      expect(getSharedDocumentMock).toHaveBeenCalledWith(
        "user-123",
        "reading_history",
        "2025",
        {
          markers: ["publicRead:reading_history/2025"],
        }
      );
    });

    it("caches shared documents to avoid redundant retrieval", async () => {
      mockEventsArray.type.length = 0;

      // First call
      await getReadingHistoryEvents(os, "user-123", 1000, 2000);
      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1);

      // Second call with same parameters
      await getReadingHistoryEvents(os, "user-123", 1000, 2000);
      expect(getSharedDocumentMock).toHaveBeenCalledTimes(1); // No new call
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
    let mockSharedDocument: any;
    let mockEventsArray: any;
    let os: CasualOSManager;

    beforeEach(() => {
      os = CasualOSManager();
      mockEventsArray = {
        type: {
          get: vi.fn(),
          length: 0,
        },
      };

      mockSharedDocument = {
        getArray: vi.fn().mockReturnValue(mockEventsArray),
      };

      vi.spyOn(os, "getSharedDocument").mockResolvedValue(mockSharedDocument);
    });

    afterEach(() => {
      vi.clearAllMocks();
      delete (globalThis as any).bot;
    });

    it("retrieves and summarizes reading history from documents", async () => {
      const event = {
        get: vi.fn((key: string) => {
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
      mockEventsArray.type.get = vi.fn().mockReturnValue(event);

      const summary = await getReadingHistorySummary(
        os,
        "user-123",
        1000,
        2000
      );

      expect(summary.totalBooksRead).toBe(1);
      expect(summary.totalChaptersRead).toBe(1);
      expect(summary.totalTimeSpentReading).toBe(1000);
    });

    it("returns summary with correct time boundaries", async () => {
      const event = {
        get: vi.fn((key: string) => {
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
      mockEventsArray.type.get = vi.fn().mockReturnValue(event);

      const summary = await getReadingHistorySummary(
        os,
        "user-123",
        1000,
        3000
      );

      expect(summary.startTime).toBe(1500);
      expect(summary.endTime).toBe(2500);
    });
  });
});
