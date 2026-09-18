import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionSelectionService";
import type { BookSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookSelection";
import type { DomainEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/EventManager";
import type { ExplodedViewServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ExplodedView";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { PieceLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import type { BookSpawnerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type {
  LabelDataStorePort,
  PieceLabelServicePort,
  SectionSelectionAdapterPort,
  SectionSelectionEventPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionSelection";

describe("pattern.bible-stack.application.services.SectionSelectionService", () => {
  let service: SectionSelectionService;
  let labelDataStorePort: Mocked<LabelDataStorePort>;
  let pieceHighlighterPort: Mocked<PieceHighlighterPort>;
  let bookSelectionServicePort: Mocked<BookSelectionServicePort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let sectionSelectionAdapterPort: Mocked<SectionSelectionAdapterPort>;
  let explodedViewServicePort: Mocked<ExplodedViewServicePort>;
  let sectionSelectionEventPort: Mocked<SectionSelectionEventPort>;
  let bookSpawnerPort: Mocked<BookSpawnerPort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let eventManager: Mocked<DomainEventManager>;

  beforeEach(() => {
    labelDataStorePort = {
      getDataByOwnerId: vi.fn(),
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

    bookSelectionServicePort = {
      selectBook: vi.fn(),
      deselectBook: vi.fn(),
      selectBooks: vi.fn(),
      deselectBooks: vi.fn(),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
    };

    pieceLifecycleServicePort = {
      createTestament: vi.fn(),
      createSection: vi.fn(),
      createBook: vi.fn(),
      createChapter: vi.fn(),
      clearPiece: vi.fn(),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
    };

    sectionSelectionAdapterPort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    explodedViewServicePort = {
      explodeSection: vi.fn(),
      registerExplodedSection: vi.fn(),
      currentExplodedSection:
        undefined as unknown as ExplodedViewServicePort["currentExplodedSection"],
    };

    sectionSelectionEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<SectionSelectionEventPort>;

    bookSpawnerPort = {
      spawnBookDomain: vi.fn(),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    eventManager = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as Mocked<DomainEventManager>;

    service = new SectionSelectionService({
      labelDataStorePort,
      pieceHighlighterPort,
      bookSelectionServicePort,
      pieceLabelServicePort,
      pieceLifecycleServicePort,
      stackUpdateServicePort,
      sectionSelectionAdapterPort,
      explodedViewServicePort,
      sectionSelectionEventPort,
      bookSpawnerPort,
      tourGuideServicePort,
      pieceHierarchyServicePort,
      eventManager,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(SectionSelectionService);
  });
});
