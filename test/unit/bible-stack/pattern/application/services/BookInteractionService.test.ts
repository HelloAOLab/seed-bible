import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BookInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BookInteractionService";
import type {
  BookDataRepositoryPort,
  PieceAdapterPort,
  SequenceStateServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/books";
import type { BookSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookSelection";
import type { ExplodedViewServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { BookInteractionConfigProviderPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/BookInteraction";

describe("pattern.bible-stack.application.services.BookInteractionService", () => {
  let service: BookInteractionService;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let bookSelectionServicePort: Mocked<BookSelectionServicePort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let explodedViewServicePort: Mocked<ExplodedViewServicePort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let bookInteractionConfigProviderPort: Mocked<BookInteractionConfigProviderPort>;
  let paintPort: Mocked<PaintPort>;

  beforeEach(() => {
    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    bookSelectionServicePort = {
      selectBook: vi.fn(),
      deselectBook: vi.fn(),
      selectBooks: vi.fn(),
      deselectBooks: vi.fn(),
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

    explodedViewServicePort = {
      explodeSection: vi.fn(),
      registerExplodedSection: vi.fn(),
      currentExplodedSection:
        undefined as unknown as ExplodedViewServicePort["currentExplodedSection"],
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
      executeAsSequence: vi.fn(),
    };

    pieceAdapterPort = {
      isPieceAnchored: vi.fn(),
    };

    bookInteractionConfigProviderPort = {
      getDelay: vi.fn(),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: undefined as unknown as PaintPort["isActive"],
    } as unknown as Mocked<PaintPort>;

    service = new BookInteractionService({
      bookDataRepositoryPort: {} as unknown as BookDataRepositoryPort,
      pieceHierarchyServicePort,
      tourGuideServicePort,
      bookSelectionServicePort,
      pieceHighlightServicePort,
      explodedViewServicePort,
      sequenceStateServicePort,
      pieceAdapterPort,
      bookInteractionConfigProviderPort,
      paintPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(BookInteractionService);
  });
});
