import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceDropService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceDropService";
import type { ChapterSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterSelection";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import type {
  PieceAdapterPort,
  PieceDropEventPort,
  ScripturePieceDropDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrop";

describe("pattern.bible-stack.application.services.ScripturePieceDropService", () => {
  let service: ScripturePieceDropService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let chapterSelectionServicePort: Mocked<ChapterSelectionPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let pieceDropEventPort: Mocked<PieceDropEventPort>;

  beforeEach(() => {
    pieceAdapterPort = {
      isPieceAnchored: vi.fn(),
      hasTransformer: vi.fn(),
      releaseTransformer: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    chapterSelectionServicePort = {
      deselectChapter: vi.fn(),
      trySelectChapter: vi.fn(),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    pieceDropEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<PieceDropEventPort>;

    service = new ScripturePieceDropService({
      pieceAdapterPort,
      pieceDataRepositoryPort:
        {} as unknown as ScripturePieceDropDataRepositoryPort,
      sequenceStateServicePort,
      pieceHierarchyServicePort,
      chapterSelectionServicePort,
      pieceHighlightServicePort,
      pieceDropEventPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ScripturePieceDropService);
  });
});
