import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceInteractabilityService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceInteractabilityService";
import type { ScripturePiecesStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ScripturePiecesState";
import type {
  BibleDataRepositoryPort,
  PieceAdapterPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceInteractability";

describe("pattern.bible-stack.application.services.PieceInteractabilityService", () => {
  let service: PieceInteractabilityService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let scripturePiecesStateServicePort: Mocked<ScripturePiecesStateServicePort>;

  beforeEach(() => {
    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getStandaloneTestaments: vi.fn(),
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    pieceAdapterPort = {
      anchorPiece: vi.fn(),
      unanchorPiece: vi.fn(),
      makeInteractable: vi.fn(),
      makeNonInteractable: vi.fn(),
    };

    scripturePiecesStateServicePort = {
      arePiecesDraggable:
        undefined as unknown as ScripturePiecesStateServicePort["arePiecesDraggable"],
      shouldShowLabelDates:
        undefined as unknown as ScripturePiecesStateServicePort["shouldShowLabelDates"],
      resetToDefault: vi.fn(),
      makePiecesDraggable: vi.fn(),
      makePiecesNotDraggable: vi.fn(),
      enableLabelDates: vi.fn(),
      disableLabelDates: vi.fn(),
    };

    service = new PieceInteractabilityService({
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
      pieceAdapterPort,
      scripturePiecesStateServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceInteractabilityService);
  });
});
