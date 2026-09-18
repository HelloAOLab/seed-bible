import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceDragService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceDragService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { StackStructureServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackStructure";
import type {
  PieceAdapterPort,
  ScripturePieceDataRepositoryPort,
  SequenceStateServicePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";

describe("pattern.bible-stack.application.services.ScripturePieceDragService", () => {
  let service: ScripturePieceDragService;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let stackStructureServicePort: Mocked<StackStructureServicePort>;

  beforeEach(() => {
    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    pieceAdapterPort = {
      isPieceAnchored: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
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

    stackStructureServicePort = {
      pullOutPieceFromParent: vi.fn(),
    };

    service = new ScripturePieceDragService({
      sequenceStateServicePort,
      pieceAdapterPort,
      scripturePieceDataRepositoryPort:
        {} as unknown as ScripturePieceDataRepositoryPort,
      pieceHierarchyServicePort,
      pieceHighlightServicePort,
      stackStructureServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ScripturePieceDragService);
  });
});
