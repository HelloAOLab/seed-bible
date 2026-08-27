import { describe, expect, it } from "vitest";
import { ReadingStateService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/ReadingStateService";

describe("application.services.ReadingStateService", () => {
  let service: ReadingStateService;
  const reading = {
    bookId: "LEV",
    chapterNumber: 3,
  };

  beforeEach(() => {
    service = new ReadingStateService();
  });

  it("returns null at start", () => {
    const result = service.getCurrentReading();

    expect(result).toBe(null);
  });

  it("correctly sets the reading", () => {
    service.setCurrentReading(reading.bookId, reading.chapterNumber);
    const result = service.getCurrentReading();

    expect(result).toEqual(reading);
  });

  it("overrides the previous reading", () => {
    service.setCurrentReading(reading.bookId, reading.chapterNumber);
    const result = service.getCurrentReading();
    expect(result).toEqual(reading);

    const secondReading = {
      bookId: "JOS",
      chapterNumber: 40,
    };
    service.setCurrentReading(
      secondReading.bookId,
      secondReading.chapterNumber
    );
    const secondResult = service.getCurrentReading();
    expect(secondResult).toEqual(secondReading);
  });
});
