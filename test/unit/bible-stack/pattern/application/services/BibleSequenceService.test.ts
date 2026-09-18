import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { BibleSequenceService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BibleSequenceService";
import type {
  BibleSequenceAdapterPort,
  BibleSequenceEventPort,
  BibleSequenceServiceConfigProviderPort,
  BookChaptersManagementServicePort,
  LabelDataRepositoryPort,
  PieceAdapterPort,
  RenderOrderAdapterPort,
  StackPieceLifecycleAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/bibleLifecycle";
import type { AwaiterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/experience";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type {
  PieceDataRepositoryPort,
  PieceLabelServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";

describe("pattern.bible-stack.application.services.BibleSequenceService", () => {
  let service: BibleSequenceService;
  let eventPort: Mocked<BibleSequenceEventPort>;
  let bibleSequenceAdapterPort: Mocked<BibleSequenceAdapterPort>;
  let awaiterPort: Mocked<AwaiterPort>;
  let configProviderPort: Mocked<BibleSequenceServiceConfigProviderPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort>;
  let labelDataRepositoryPort: Mocked<LabelDataRepositoryPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let stackPieceLifecycleAdapterPort: Mocked<StackPieceLifecycleAdapterPort>;
  let bookChaptersManagementServicePort: Mocked<BookChaptersManagementServicePort>;
  let renderOrderAdapterPort: Mocked<RenderOrderAdapterPort>;

  beforeEach(() => {
    eventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<BibleSequenceEventPort>;

    bibleSequenceAdapterPort = {
      displayCrackOpenBibleSequence: vi.fn(),
      displayCloseBibleSequence: vi.fn(),
      displayOpenBibleSequence: vi.fn(),
    };

    awaiterPort = {
      sleep: vi.fn(),
    };

    configProviderPort = {
      getTestamentHighlightSequenceConfig: vi.fn(),
    } as unknown as Mocked<BibleSequenceServiceConfigProviderPort>;

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

    pieceLabelServicePort = {
      hideLabel: vi.fn(),
    };

    labelDataRepositoryPort = {
      getDataByOwnerId: vi.fn(),
    };

    pieceAdapterPort = {
      makeNonInteractable: vi.fn(),
      makeInteractable: vi.fn(),
      isPieceBeingUsed: vi.fn(),
    };

    stackPieceLifecycleAdapterPort = {
      spawnBibleTransformer: vi.fn(),
      spawnCover: vi.fn(),
      spawnCrossLine: vi.fn(),
      spawnShadow: vi.fn(),
      despawnSectionShadow: vi.fn(),
      despawnTestament: vi.fn(),
      despawnSection: vi.fn(),
      despawnBook: vi.fn(),
      despawnSectionBook: vi.fn(),
      spawnSectionDomain: vi.fn(),
      spawnSectionBookDomain: vi.fn(),
    };

    bookChaptersManagementServicePort = {
      showChapters: vi.fn(),
      hideChapters: vi.fn(),
    };

    renderOrderAdapterPort = {
      setSortedRenderOrder: vi.fn(),
    };

    service = new BibleSequenceService({
      eventPort,
      bibleSequenceAdapterPort,
      scripturePiecesStateServicePort: {
        arePiecesDraggable: false,
      },
      awaiterPort,
      configProviderPort,
      pieceHighlightServicePort,
      pieceLabelServicePort,
      labelDataRepositoryPort,
      pieceAdapterPort,
      stackPieceLifecycleAdapterPort,
      bookChaptersManagementServicePort,
      renderOrderAdapterPort,
      pieceDataRepositoryPort: {} as unknown as Pick<
        PieceDataRepositoryPort,
        | "getAllTestaments"
        | "getAllSections"
        | "getAllSectionBooks"
        | "getAllBooks"
        | "getAllChapters"
      >,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(BibleSequenceService);
  });
});
