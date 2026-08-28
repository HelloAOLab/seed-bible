import { describe, expect, it, vi, type Mocked, beforeEach } from "vitest";
import { PieceInteractionService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/PieceInteractionService";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import type { ReadingStatePort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/readingState";
import type {
  VerseReferenceConfigProviderPort,
  ContextMenuRendererPort,
  PieceHighlightPort,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/PieceInteraction";

describe("application.services.PieceInteractionService", () => {
  let pieceHighlight: Mocked<PieceHighlightPort>;
  let contextMenu: Mocked<ContextMenuRendererPort>;
  let verseReferenceConfigProviderPort: Mocked<VerseReferenceConfigProviderPort>;
  let readingState: Mocked<ReadingStatePort>;
  let getExperienceKey: Mocked<() => ExperienceKey>;
  let service: PieceInteractionService;
  const experienceKey = EXPERIENCE_KEYS.TABERNACLE;

  beforeEach(() => {
    pieceHighlight = {
      highlightPiece: vi.fn(),
    };
    contextMenu = {
      toggleContextMenu: vi.fn(),
    };
    verseReferenceConfigProviderPort = {
      getVersesForPiece: vi.fn(),
    };
    readingState = {
      setCurrentReading: vi.fn(),
      getCurrentReading: vi.fn(),
    };
    getExperienceKey = vi.fn(() => experienceKey);
    service = new PieceInteractionService({
      pieceHighlight,
      contextMenu,
      verseReferenceConfigProviderPort,
      readingState,
      getExperienceKey,
    });
  });

  it("handles piece selection, forwarding the right values", () => {
    const pieceKey = "bars";
    const reading = {
      bookId: "GEN",
      chapterNumber: 10,
    };
    const inChapter = [
      {
        bookId: "EXO",
        chapter: 10,
        verse: 1,
      },
    ];
    const inOtherChapters = [
      {
        bookId: "LEV",
        chapter: 20,
        verse: 30,
      },
    ];
    readingState.getCurrentReading.mockImplementation(() => reading);
    verseReferenceConfigProviderPort.getVersesForPiece.mockImplementation(
      () => ({
        inChapter,
        inOtherChapters,
      })
    );
    service.handlePieceSelection(pieceKey);
    expect(
      verseReferenceConfigProviderPort.getVersesForPiece
    ).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        experienceKey: experienceKey,
        pieceKey: pieceKey,
        currentBookId: reading.bookId,
        currentChapter: reading.chapterNumber,
      })
    );
    expect(pieceHighlight.highlightPiece).toHaveBeenCalledExactlyOnceWith(
      experienceKey,
      pieceKey
    );
    expect(contextMenu.toggleContextMenu).toHaveBeenCalledExactlyOnceWith(
      experienceKey,
      pieceKey,
      inChapter,
      inOtherChapters
    );
  });

  it("it passes empty inChapter and inOtherChapters to toggleContextMenu if no reading found", () => {
    const pieceKey = "bars";
    readingState.getCurrentReading.mockImplementation(() => null);
    service.handlePieceSelection(pieceKey);
    expect(contextMenu.toggleContextMenu).toHaveBeenCalledExactlyOnceWith(
      experienceKey,
      pieceKey,
      [],
      []
    );
  });
});
