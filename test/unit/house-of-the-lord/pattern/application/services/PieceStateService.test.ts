import { describe, expect, it, vi, type Mocked } from "vitest";
import { PieceStateService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/PieceStateService";
import type {
  PieceStateConfigProviderPort,
  PieceStatePort,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/PieceState";
import type { ReadingStatePort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/readingState";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";

describe("application.services.PieceStateService", () => {
  let pieceState: Mocked<PieceStatePort>;
  let pieceStateConfigProviderPort: Mocked<PieceStateConfigProviderPort>;
  let readingState: Mocked<ReadingStatePort>;
  let getExperienceKey: Mocked<() => ExperienceKey>;
  let service: PieceStateService;
  const experience = EXPERIENCE_KEYS.TABERNACLE;
  const reading = { bookId: "MAT", chapterNumber: 15 };

  beforeEach(() => {
    pieceState = {
      applyMeshState: vi.fn(),
    };
    pieceStateConfigProviderPort = {
      getPiecesChapterState: vi.fn(() => ({})),
    };
    readingState = {
      getCurrentReading: vi.fn(),
      setCurrentReading: vi.fn(),
    };
    getExperienceKey = vi.fn(() => experience);
    service = new PieceStateService({
      pieceState,
      pieceStateConfigProviderPort,
      readingState,
      getExperienceKey,
    });
  });

  it("no-ops if no reading state provided", () => {
    readingState.getCurrentReading.mockReturnValue(null);
    service.updatePiecesState();
    expect(pieceState.applyMeshState).not.toHaveBeenCalled();
  });

  it("gets pieces states with the correct values", () => {
    readingState.getCurrentReading.mockReturnValue(reading);
    service.updatePiecesState();
    expect(
      pieceStateConfigProviderPort.getPiecesChapterState
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        experienceKey: experience,
        bookId: reading.bookId,
        chapter: reading.chapterNumber,
      })
    );
  });

  it("applies mesh state to the provided keys", () => {
    const states = {
      "altar-of-sacrifice": "hidden",
      "ark-of-covenant": "shown",
      bars: "translucent",
    } as const;
    const stateKeys = Object.keys(states) as (keyof typeof states)[];
    readingState.getCurrentReading.mockReturnValue(reading);
    pieceStateConfigProviderPort.getPiecesChapterState.mockReturnValue(states);
    service.updatePiecesState();
    expect(pieceState.applyMeshState).toHaveBeenCalledTimes(stateKeys.length);
    for (const key of stateKeys) {
      expect(pieceState.applyMeshState).toHaveBeenCalledWith(
        expect.objectContaining({
          experience,
          key,
          state: states[key],
        })
      );
    }
  });
});
