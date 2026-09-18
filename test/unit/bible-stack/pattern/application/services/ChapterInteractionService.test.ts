import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ChapterInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ChapterInteractionService";
import type {
  ChapterDataRepositoryPort,
  ChapterNavigationServicePort,
  UserPresenceServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/chapters";
import type { ChapterSelectionPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ChapterSelection";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";

describe("pattern.bible-stack.application.services.ChapterInteractionService", () => {
  let service: ChapterInteractionService;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let chapterSelectionServicePort: Mocked<ChapterSelectionPort>;
  let pieceHighlighterPort: Mocked<PieceHighlighterPort>;
  let chapterNavigationServicePort: Mocked<ChapterNavigationServicePort>;
  let userPresenceServicePort: Mocked<UserPresenceServicePort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    chapterSelectionServicePort = {
      deselectChapter: vi.fn(),
      trySelectChapter: vi.fn(),
    };

    pieceHighlighterPort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    chapterNavigationServicePort = {
      openChapter: vi.fn(),
    };

    userPresenceServicePort = {
      updateUserPresence: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: undefined as unknown as PaintPort["isActive"],
    } as unknown as Mocked<PaintPort>;

    service = new ChapterInteractionService({
      chapterDataRepositoryPort: {} as unknown as ChapterDataRepositoryPort,
      pieceHierarchyServicePort,
      chapterSelectionServicePort,
      pieceHighlighterPort,
      chapterNavigationServicePort,
      userPresenceServicePort,
      paintPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ChapterInteractionService);
  });
});
