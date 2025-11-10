import {
  calculateReadingHistorySummary,
  ReadingEvent,
} from "@packages/seed-bible/db/annotations/library";

describe("reading history", () => {
  describe("calculateReadingHistorySummary", () => {
    it("should calculate a simple summary", () => {
      const events: ReadingEvent[] = [
        {
          bookId: "GEN",
          chapter: 1,
          start: 0,
          end: 100,
          userId: "user1",
        },
        {
          bookId: "GEN",
          chapter: 2,
          start: 100,
          end: 200,
          userId: "user1",
        },
        {
          bookId: "EXO",
          chapter: 5,
          start: 300,
          end: 400,
          userId: "user1",
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary).toEqual({
        totalBooksRead: 2,
        totalChaptersRead: 3,
        totalTimeSpentReading: 300,
        users: {
          user1: {
            uniqueBooksRead: 2,
            uniqueChaptersRead: 3,
            totalTimeSpentReading: 300,
            books: {
              GEN: {
                uniqueChaptersRead: 2,
                totalTimeSpentReading: 200,
                chapters: {
                  1: [
                    {
                      bookId: "GEN",
                      chapter: 1,
                      start: 0,
                      end: 100,
                      userId: "user1",
                    },
                  ],
                  2: [
                    {
                      bookId: "GEN",
                      chapter: 2,
                      start: 100,
                      end: 200,
                      userId: "user1",
                    },
                  ],
                },
              },
              EXO: {
                uniqueChaptersRead: 1,
                totalTimeSpentReading: 100,
                chapters: {
                  5: [
                    {
                      bookId: "EXO",
                      chapter: 5,
                      start: 300,
                      end: 400,
                      userId: "user1",
                    },
                  ],
                },
              },
            },
          },
        },
        startTime: 0,
        endTime: 400,
      });
    });

    it("should calculate a multi-user summary", () => {
      const events: ReadingEvent[] = [
        {
          bookId: "GEN",
          chapter: 1,
          start: 0,
          end: 100,
          userId: "user1",
        },
        {
          bookId: "GEN",
          chapter: 1,
          start: 500,
          end: 600,
          userId: "user2",
        },
        {
          bookId: "GEN",
          chapter: 2,
          start: 100,
          end: 200,
          userId: "user1",
        },
        {
          bookId: "GEN",
          chapter: 2,
          start: 700,
          end: 800,
          userId: "user2",
        },
        {
          bookId: "EXO",
          chapter: 5,
          start: 300,
          end: 400,
          userId: "user1",
        },
        {
          bookId: "EXO",
          chapter: 2,
          start: 1000,
          end: 1100,
          userId: "user2",
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary).toEqual({
        totalBooksRead: 4,
        totalChaptersRead: 6,
        totalTimeSpentReading: 600,
        users: {
          user1: {
            uniqueBooksRead: 2,
            uniqueChaptersRead: 3,
            totalTimeSpentReading: 300,
            books: {
              GEN: {
                uniqueChaptersRead: 2,
                totalTimeSpentReading: 200,
                chapters: {
                  1: [
                    {
                      bookId: "GEN",
                      chapter: 1,
                      start: 0,
                      end: 100,
                      userId: "user1",
                    },
                  ],
                  2: [
                    {
                      bookId: "GEN",
                      chapter: 2,
                      start: 100,
                      end: 200,
                      userId: "user1",
                    },
                  ],
                },
              },
              EXO: {
                uniqueChaptersRead: 1,
                totalTimeSpentReading: 100,
                chapters: {
                  5: [
                    {
                      bookId: "EXO",
                      chapter: 5,
                      start: 300,
                      end: 400,
                      userId: "user1",
                    },
                  ],
                },
              },
            },
          },
          user2: {
            uniqueBooksRead: 2,
            uniqueChaptersRead: 3,
            totalTimeSpentReading: 300,
            books: {
              GEN: {
                uniqueChaptersRead: 2,
                totalTimeSpentReading: 200,
                chapters: {
                  1: [
                    {
                      bookId: "GEN",
                      chapter: 1,
                      start: 500,
                      end: 600,
                      userId: "user2",
                    },
                  ],
                  2: [
                    {
                      bookId: "GEN",
                      chapter: 2,
                      start: 700,
                      end: 800,
                      userId: "user2",
                    },
                  ],
                },
              },
              EXO: {
                uniqueChaptersRead: 1,
                totalTimeSpentReading: 100,
                chapters: {
                  2: [
                    {
                      bookId: "EXO",
                      chapter: 2,
                      start: 1000,
                      end: 1100,
                      userId: "user2",
                    },
                  ],
                },
              },
            },
          },
        },
        startTime: 0,
        endTime: 1100,
      });
    });

    it("should support revisiting a chapter", () => {
      const events: ReadingEvent[] = [
        {
          bookId: "GEN",
          chapter: 10,
          start: 0,
          end: 100,
          userId: "user1",
        },
        {
          bookId: "EXO",
          chapter: 2,
          start: 100,
          end: 200,
          userId: "user1",
        },
        {
          bookId: "GEN",
          chapter: 10,
          start: 300,
          end: 400,
          userId: "user1",
        },
      ];

      const summary = calculateReadingHistorySummary(events);

      expect(summary).toEqual({
        totalBooksRead: 2,
        totalChaptersRead: 2,
        totalTimeSpentReading: 300,
        users: {
          user1: {
            uniqueBooksRead: 2,
            uniqueChaptersRead: 2,
            totalTimeSpentReading: 300,
            books: {
              GEN: {
                uniqueChaptersRead: 1,
                totalTimeSpentReading: 200,
                chapters: {
                  10: [
                    {
                      bookId: "GEN",
                      chapter: 10,
                      start: 0,
                      end: 100,
                      userId: "user1",
                    },
                    {
                      bookId: "GEN",
                      chapter: 10,
                      start: 300,
                      end: 400,
                      userId: "user1",
                    },
                  ],
                },
              },
              EXO: {
                uniqueChaptersRead: 1,
                totalTimeSpentReading: 100,
                chapters: {
                  2: [
                    {
                      bookId: "EXO",
                      chapter: 2,
                      start: 100,
                      end: 200,
                      userId: "user1",
                    },
                  ],
                },
              },
            },
          },
        },
        startTime: 0,
        endTime: 400,
      });
    });
  });
});
