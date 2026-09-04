import type { SharedDocument } from "@casual-simulation/aux-common/documents/SharedDocument";
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
  mergeReadingEvents,
  saveReadingHistory,
  saveReadingHistorySpan,
  writeReadingEventsToDocument,
  type ReadingEvent,
  clearReadingHistoryDocs,
} from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import {
  createInMemoryReadingHistoryStore,
  type OfflineReadingHistoryStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineReadingHistoryStore";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { signal } from "@preact/signals";
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
      getSharedDocumentMock = vi
        .spyOn(os, "getSharedDocument")
        .mockResolvedValue({
          getArray: vi.fn().mockReturnValue(eventsArray),
          createMap: vi.fn().mockReturnValue({
            set: createMapSetMock,
          }),
        } as unknown as SharedDocument);

      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.useRealTimers();
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
      clearReadingHistoryDocs();
      vi.clearAllMocks();
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
      clearReadingHistoryDocs();
      vi.clearAllMocks();
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

  describe("durability of recorded reading", () => {
    /**
     * A stand-in for the Yjs document that actually stores events, rather than
     * a spy over its methods — these tests are about what ends up in it after a
     * push, a failed push and a replay, which a call-count assertion can't see.
     */
    function createFakeSharedDocument() {
      const maps: {
        get: (key: string) => any;
        set: (key: string, value: any) => void;
      }[] = [];

      const createMap = () => {
        const values = new Map<string, any>();
        return {
          get: (key: string) => values.get(key),
          set: (key: string, value: any) => {
            values.set(key, value);
          },
        };
      };

      const array = {
        get length() {
          return maps.length;
        },
        push: (map: (typeof maps)[number]) => {
          maps.push(map);
        },
        type: {
          get length() {
            return maps.length;
          },
          get: (index: number) => maps[index],
        },
      };

      return {
        doc: {
          getArray: () => array,
          createMap,
        } as unknown as SharedDocument,
        /** Puts an event in the document without going through a save. */
        seed: (event: ReadingEvent) => {
          const map = createMap();
          for (const [key, value] of Object.entries(event)) {
            map.set(key, value);
          }
          maps.push(map);
        },
        events: (): ReadingEvent[] =>
          maps.map((map) => ({
            userId: map.get("userId"),
            bookId: map.get("bookId"),
            chapter: map.get("chapter"),
            start: map.get("start"),
            end: map.get("end"),
          })),
      };
    }

    /** 2026-06-15T12:00:00Z. */
    const NOON = Math.floor(Date.UTC(2026, 5, 15, 12) / 1000);
    const WINDOW_START = Math.floor(Date.UTC(2026, 5, 15) / 1000);
    const WINDOW_END = Math.floor(Date.UTC(2026, 5, 16) / 1000);

    let os: CasualOSManager;
    let store: OfflineReadingHistoryStore;
    let fakeDoc: ReturnType<typeof createFakeSharedDocument>;

    beforeEach(() => {
      os = CasualOSManager();
      store = createInMemoryReadingHistoryStore();
      fakeDoc = createFakeSharedDocument();
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      clearReadingHistoryDocs();
      vi.restoreAllMocks();
    });

    const save = (chapter: number, nowSeconds: number) =>
      saveReadingHistory(os, "user-1", "user-1", "GEN", chapter, {
        store,
        nowSeconds,
      });

    it("records the event locally and pushes it to the document", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);

      await save(1, NOON);

      expect(fakeDoc.events()).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON,
        },
      ]);
      // Nothing left queued: the document has it.
      expect(await store.listPending("user-1")).toEqual([]);
    });

    it("keeps the event when the document can't be reached", async () => {
      vi.spyOn(os, "getSharedDocument").mockRejectedValue(
        new Error("no connection")
      );

      await expect(save(1, NOON)).rejects.toThrow("no connection");

      const pending = await store.listPending("user-1");
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        bookId: "GEN",
        chapter: 1,
        start: NOON,
      });
    });

    it("reports reading that never reached the server", async () => {
      vi.spyOn(os, "getSharedDocument").mockRejectedValue(
        new Error("no connection")
      );
      await expect(save(1, NOON)).rejects.toThrow();

      const events = Array.from(
        await getReadingHistoryEvents(os, "user-1", WINDOW_START, WINDOW_END, {
          store,
        })
      );

      expect(events).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON,
        },
      ]);
    });

    it("extends one event rather than adding a second while reading continues", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);

      await save(1, NOON);
      await save(1, NOON + 5);
      await save(1, NOON + 10);

      expect(fakeDoc.events()).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON + 10,
        },
      ]);
    });

    it("does not duplicate an event that is replayed into the document", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);
      const event: ReadingEvent = {
        userId: "user-1",
        bookId: "GEN",
        chapter: 1,
        start: NOON,
        end: NOON + 5,
      };

      await writeReadingEventsToDocument(os, "user-1", 2026, [event]);
      await writeReadingEventsToDocument(os, "user-1", 2026, [event]);
      await writeReadingEventsToDocument(os, "user-1", 2026, [
        { ...event, end: NOON + 20 },
      ]);

      expect(fakeDoc.events()).toEqual([{ ...event, end: NOON + 20 }]);
    });

    it("never moves an event's end backwards", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);
      const event: ReadingEvent = {
        userId: "user-1",
        bookId: "GEN",
        chapter: 1,
        start: NOON,
        end: NOON + 20,
      };

      await writeReadingEventsToDocument(os, "user-1", 2026, [event]);
      await writeReadingEventsToDocument(os, "user-1", 2026, [
        { ...event, end: NOON + 5 },
      ]);

      expect(fakeDoc.events()).toEqual([event]);
    });

    it("counts an event held both locally and on the server only once", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);
      await save(1, NOON);
      await save(1, NOON + 5);

      const events = Array.from(
        await getReadingHistoryEvents(os, "user-1", WINDOW_START, WINDOW_END, {
          store,
        })
      );

      expect(events).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON + 5,
        },
      ]);
    });

    it("retries the document after one failed sync rather than failing for the rest of the page load", async () => {
      const stored: ReadingEvent = {
        userId: "user-1",
        bookId: "GEN",
        chapter: 1,
        start: NOON,
        end: NOON + 5,
      };
      fakeDoc.seed(stored);
      const getSharedDocument = vi
        .spyOn(os, "getSharedDocument")
        .mockRejectedValueOnce(new Error("session expired"))
        .mockResolvedValue(fakeDoc.doc);

      // The first read can't reach the document, so it has nothing to report.
      expect(
        Array.from(
          await getReadingHistoryEvents(
            os,
            "user-1",
            WINDOW_START,
            WINDOW_END,
            { store: null }
          )
        )
      ).toEqual([]);

      const events = Array.from(
        await getReadingHistoryEvents(os, "user-1", WINDOW_START, WINDOW_END, {
          store: null,
        })
      );

      // The failure was dropped from the cache instead of being left there to
      // answer every later request, so the second read actually tries again.
      expect(getSharedDocument).toHaveBeenCalledTimes(2);
      expect(events).toEqual([stored]);
    });

    it("still records reading when this device can't keep a local store", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);
      const broken: OfflineReadingHistoryStore = {
        ...store,
        recordReadingSpan: () => Promise.reject(new Error("storage blocked")),
      };

      await saveReadingHistory(os, "user-1", "user-1", "GEN", 1, {
        store: broken,
        nowSeconds: NOON,
      });
      await saveReadingHistory(os, "user-1", "user-1", "GEN", 1, {
        store: broken,
        nowSeconds: NOON + 5,
      });

      // One event, extended — the same answer the document-only path always gave.
      expect(fakeDoc.events()).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON + 5,
        },
      ]);
    });

    it("treats a push that landed as a success even if the local bookkeeping fails", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);
      const flaky: OfflineReadingHistoryStore = {
        ...store,
        recordReadingSpan: (input) => store.recordReadingSpan(input),
        markSynced: () => Promise.reject(new Error("storage blocked")),
      };

      await expect(
        saveReadingHistory(os, "user-1", "user-1", "GEN", 1, {
          store: flaky,
          nowSeconds: NOON,
        })
      ).resolves.toBeUndefined();

      expect(fakeDoc.events()).toHaveLength(1);
    });

    it("keeps a measured stretch that can't be pushed, and still reports it", async () => {
      vi.spyOn(os, "getSharedDocument").mockRejectedValue(
        new Error("no connection")
      );

      await expect(
        saveReadingHistorySpan(
          os,
          "user-1",
          "user-1",
          "GEN",
          1,
          NOON,
          NOON + 45 * 60,
          { store }
        )
      ).rejects.toThrow("no connection");

      const pending = await store.listPending("user-1");
      expect(pending).toHaveLength(1);

      const events = Array.from(
        await getReadingHistoryEvents(os, "user-1", WINDOW_START, WINDOW_END, {
          store,
        })
      );

      // The whole 45 minutes, not just the moment it was reported.
      expect(events).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON + 45 * 60,
        },
      ]);
    });

    it("credits one sitting across a run of reader ticks", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);

      // What the reader does: each tick credits the stretch since the last one.
      for (let i = 0; i < 4; i++) {
        await saveReadingHistorySpan(
          os,
          "user-1",
          "user-1",
          "GEN",
          1,
          NOON + i * 5,
          NOON + (i + 1) * 5,
          { store, joinThresholdSeconds: 30 }
        );
      }

      expect(fakeDoc.events()).toEqual([
        {
          userId: "user-1",
          bookId: "GEN",
          chapter: 1,
          start: NOON,
          end: NOON + 20,
        },
      ]);
      expect(await store.listPending("user-1")).toEqual([]);
    });

    it("reports another reader's history without mixing in this device's", async () => {
      vi.spyOn(os, "getSharedDocument").mockResolvedValue(fakeDoc.doc);
      await save(1, NOON);

      const events = Array.from(
        await getReadingHistoryEvents(
          os,
          "someone-else",
          WINDOW_START,
          WINDOW_END,
          { store }
        )
      );

      // The fake document is shared by every record here, so the pushed event
      // still shows up — what must not appear is a second, locally-sourced copy.
      expect(events).toHaveLength(1);
    });
  });

  describe("mergeReadingEvents", () => {
    const base: ReadingEvent = {
      userId: "user-1",
      bookId: "GEN",
      chapter: 1,
      start: 100,
      end: 200,
    };

    it("keeps the more complete copy of a duplicated event", () => {
      expect(mergeReadingEvents([[base], [{ ...base, end: 300 }]])).toEqual([
        { ...base, end: 300 },
      ]);
      expect(mergeReadingEvents([[{ ...base, end: 300 }], [base]])).toEqual([
        { ...base, end: 300 },
      ]);
    });

    it("treats a different start as a different event", () => {
      const later = { ...base, start: 500, end: 600 };
      expect(mergeReadingEvents([[base], [later]])).toEqual([base, later]);
    });

    it("keeps each reader's and each chapter's events apart", () => {
      const otherReader = { ...base, userId: "user-2" };
      const otherChapter = { ...base, chapter: 2 };
      const otherBook = { ...base, bookId: "EXO" };

      expect(
        mergeReadingEvents([[base, otherReader, otherChapter, otherBook]])
      ).toHaveLength(4);
    });
  });

  describe("createReadingHistoryManager with a local store", () => {
    /** 2026-06-15T12:00:00Z. */
    const NOON_MS = Date.UTC(2026, 5, 15, 12);

    let os: CasualOSManager;
    let store: OfflineReadingHistoryStore;
    let login: LoginManager;

    beforeEach(() => {
      os = CasualOSManager();
      store = createInMemoryReadingHistoryStore();
      login = {
        userId: signal<string | null>("user-1"),
      } as unknown as LoginManager;
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.useFakeTimers();
      vi.setSystemTime(NOON_MS);
    });

    afterEach(() => {
      clearReadingHistoryDocs();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("keeps the event and stays quiet when the push fails", async () => {
      vi.spyOn(os, "getSharedDocument").mockRejectedValue(
        new Error("no connection")
      );
      const manager = createReadingHistoryManager(os, login, { store });

      manager.saveReadingHistory("GEN", 1);
      await vi.advanceTimersByTimeAsync(300);
      // Let the pending-count refresh the failure schedules settle.
      await vi.advanceTimersByTimeAsync(0);

      expect(await store.listPending("user-1")).toHaveLength(1);
      expect(manager.sync.pendingCount.value).toBe(1);

      manager.dispose();
    });

    it("does not write anything when nobody is signed in", async () => {
      const getSharedDocument = vi
        .spyOn(os, "getSharedDocument")
        .mockRejectedValue(new Error("should not be called"));
      (login.userId as unknown as { value: string | null }).value = null;
      const manager = createReadingHistoryManager(os, login, { store });

      manager.saveReadingHistory("GEN", 1);
      await vi.advanceTimersByTimeAsync(300);

      expect(getSharedDocument).not.toHaveBeenCalled();
      expect(await store.listPending("user-1")).toEqual([]);

      manager.dispose();
    });
  });

  describe("saveReadingHistorySpan", () => {
    let os: CasualOSManager;
    let storedEvents: ReturnType<typeof makeStoredEvent>[];
    let eventsArray: any;
    let createdEvent: { set: Mock };

    /** A stand-in for one event map inside the shared document. */
    function makeStoredEvent(fields: Record<string, unknown>) {
      const data = { ...fields };
      return {
        data,
        get: (key: string) => data[key],
        set: vi.fn((key: string, value: unknown) => {
          data[key] = value;
        }),
      };
    }

    beforeEach(() => {
      clearReadingHistoryDocs();
      os = CasualOSManager();
      storedEvents = [];
      createdEvent = { set: vi.fn() };
      eventsArray = {
        get length() {
          return storedEvents.length;
        },
        type: {
          get: (i: number) => storedEvents[i],
        },
        push: vi.fn(),
      };
      vi.spyOn(os, "getSharedDocument").mockResolvedValue({
        getArray: vi.fn().mockReturnValue(eventsArray),
        createMap: vi.fn().mockReturnValue(createdEvent),
      } as unknown as SharedDocument);
    });

    afterEach(() => {
      vi.clearAllMocks();
      clearReadingHistoryDocs();
    });

    it("records the whole span as a new event when there is nothing to join", async () => {
      await saveReadingHistorySpan(
        os,
        "user-1",
        "user-1",
        "psalms",
        23,
        1_700_000_000,
        1_700_000_360
      );

      expect(eventsArray.push).toHaveBeenCalledTimes(1);
      expect(createdEvent.set).toHaveBeenCalledWith("start", 1_700_000_000);
      expect(createdEvent.set).toHaveBeenCalledWith("end", 1_700_000_360);
    });

    it("extends an event the span continues, even one older than the join threshold", async () => {
      // A listen that ran for 45 minutes: the event was opened when the chapter
      // was first shown, so by the time the listening is written it sits well
      // outside a window measured from the clock rather than from the span.
      const start = 1_700_000_000;
      const existing = makeStoredEvent({
        userId: "user-1",
        bookId: "psalms",
        chapter: 23,
        start,
        end: start + 5,
      });
      storedEvents.push(existing);

      await saveReadingHistorySpan(
        os,
        "user-1",
        "user-1",
        "psalms",
        23,
        start,
        start + 45 * 60
      );

      expect(eventsArray.push).not.toHaveBeenCalled();
      expect(existing.set).toHaveBeenCalledWith("end", start + 45 * 60);
      expect(existing.data.end).toBe(start + 45 * 60);
    });

    it("opens a separate event for a span that starts long after the last one ended", async () => {
      const start = 1_700_000_000;
      storedEvents.push(
        makeStoredEvent({
          userId: "user-1",
          bookId: "psalms",
          chapter: 23,
          start,
          end: start + 60,
        })
      );

      await saveReadingHistorySpan(
        os,
        "user-1",
        "user-1",
        "psalms",
        23,
        start + 5 * 60 * 60,
        start + 5 * 60 * 60 + 120
      );

      expect(eventsArray.push).toHaveBeenCalledTimes(1);
      expect(createdEvent.set).toHaveBeenCalledWith(
        "start",
        start + 5 * 60 * 60
      );
    });

    it("never moves an event's end backwards", async () => {
      const start = 1_700_000_000;
      const existing = makeStoredEvent({
        userId: "user-1",
        bookId: "psalms",
        chapter: 23,
        start,
        end: start + 600,
      });
      storedEvents.push(existing);

      await saveReadingHistorySpan(
        os,
        "user-1",
        "user-1",
        "psalms",
        23,
        start,
        start + 120
      );

      expect(existing.data.end).toBe(start + 600);
      expect(eventsArray.push).not.toHaveBeenCalled();
    });

    it("leaves another chapter's event alone", async () => {
      const start = 1_700_000_000;
      const other = makeStoredEvent({
        userId: "user-1",
        bookId: "psalms",
        chapter: 22,
        start,
        end: start + 5,
      });
      storedEvents.push(other);

      await saveReadingHistorySpan(
        os,
        "user-1",
        "user-1",
        "psalms",
        23,
        start,
        start + 300
      );

      expect(other.set).not.toHaveBeenCalled();
      expect(eventsArray.push).toHaveBeenCalledTimes(1);
    });

    it("saveReadingSpan does nothing when the user is signed out", async () => {
      const manager = createReadingHistoryManager(os, {
        userId: { value: null },
      } as any);

      manager.saveReadingSpan("psalms", 23, 1_700_000_000, 1_700_000_360);
      await Promise.resolve();

      expect(os.getSharedDocument).not.toHaveBeenCalled();
    });

    it("saveReadingSpan starts a new event rather than swallowing the gap before it", async () => {
      // What a locked phone leaves behind: a sitting that stopped being watched
      // twenty minutes ago, and measured time that only starts now.
      const start = 1_700_000_000;
      const abandoned = makeStoredEvent({
        userId: "user-1",
        bookId: "psalms",
        chapter: 23,
        start,
        end: start + 60,
      });
      storedEvents.push(abandoned);

      const manager = createReadingHistoryManager(os, {
        userId: { value: "user-1" },
      } as any);

      manager.saveReadingSpan(
        "psalms",
        23,
        start + 20 * 60,
        start + 20 * 60 + 5
      );
      await vi.waitFor(() => expect(eventsArray.push).toHaveBeenCalled());

      expect(abandoned.data.end).toBe(start + 60);
      expect(createdEvent.set).toHaveBeenCalledWith("start", start + 20 * 60);
    });

    it("saveReadingSpan writes the span for the signed-in user", async () => {
      const manager = createReadingHistoryManager(os, {
        userId: { value: "user-1" },
      } as any);

      manager.saveReadingSpan("psalms", 23, 1_700_000_000, 1_700_000_360);
      await vi.waitFor(() => expect(eventsArray.push).toHaveBeenCalled());

      expect(createdEvent.set).toHaveBeenCalledWith("bookId", "psalms");
      expect(createdEvent.set).toHaveBeenCalledWith("chapter", 23);
      expect(createdEvent.set).toHaveBeenCalledWith("start", 1_700_000_000);
      expect(createdEvent.set).toHaveBeenCalledWith("end", 1_700_000_360);
    });
  });

  describe("the shared local store", () => {
    /** 2026-06-15T12:00:00Z. */
    const NOON = Math.floor(Date.UTC(2026, 5, 15, 12) / 1000);

    afterEach(() => {
      vi.doUnmock(
        "@packages/seed-bible/seed-bible/managers/OfflineReadingHistoryStore"
      );
      vi.resetModules();
      vi.restoreAllMocks();
    });

    /**
     * Loads a fresh copy of the manager with a counting store factory.
     *
     * The module-level singleton is memoised for the life of a page load, which
     * is the behaviour under test — so it has to start unset, and only resetting
     * the module registry does that.
     */
    async function loadWithCountingStore() {
      vi.resetModules();
      const created: OfflineReadingHistoryStore[] = [];
      vi.doMock(
        "@packages/seed-bible/seed-bible/managers/OfflineReadingHistoryStore",
        async (importOriginal) => {
          const actual =
            (await importOriginal()) as typeof import("@packages/seed-bible/seed-bible/managers/OfflineReadingHistoryStore");
          return {
            ...actual,
            createIndexedDbReadingHistoryStore: () => {
              const store = actual.createInMemoryReadingHistoryStore();
              created.push(store);
              return store;
            },
          };
        }
      );
      const manager =
        await import("@packages/seed-bible/seed-bible/managers/ReadingHistoryManager");
      return { manager, created };
    }

    it("builds one store per page load and hands the same one out again", async () => {
      const { manager, created } = await loadWithCountingStore();

      const first = manager.getSharedReadingHistoryStore();
      const second = manager.getSharedReadingHistoryStore();

      // One database, one connection to it: `TodayManager` and Scripture Map
      // both call these functions directly, so a store built per call would
      // mean a connection per caller.
      expect(created).toHaveLength(1);
      expect(first).toBe(created[0]);
      expect(second).toBe(first);
    });

    it("records into the shared store when a caller names none", async () => {
      const { manager } = await loadWithCountingStore();
      const os = CasualOSManager();
      vi.spyOn(os, "getSharedDocument").mockResolvedValue({
        getArray: () => ({
          length: 0,
          push: () => {},
          type: { length: 0, get: () => undefined },
        }),
        createMap: () => ({ get: () => undefined, set: () => {} }),
      } as unknown as SharedDocument);

      // No `store` option at all — the path every production caller takes.
      await manager.saveReadingHistorySpan(
        os,
        "user-1",
        "user-1",
        "GEN",
        1,
        NOON,
        NOON + 5
      );

      const shared = manager.getSharedReadingHistoryStore();
      expect(shared).not.toBeNull();
      const rows = await shared!.listForWindow("user-1", 0, NOON + 100);
      expect(rows.map((r) => ({ start: r.start, end: r.end }))).toEqual([
        { start: NOON, end: NOON + 5 },
      ]);
    });
  });
});
