import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceDraggingService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceDraggingService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import type {
  PieceAdapterPort,
  ScripturePieceDraggingDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDragging";

describe("pattern.bible-stack.application.services.ScripturePieceDraggingService", () => {
  let service: ScripturePieceDraggingService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;

  beforeEach(() => {
    pieceAdapterPort = {
      updatePosition: vi.fn(),
      isPieceAnchored: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    service = new ScripturePieceDraggingService({
      pieceAdapterPort,
      pieceDataRepositoryPort:
        {} as unknown as ScripturePieceDraggingDataRepositoryPort,
      sequenceStateServicePort,
      pieceHierarchyServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ScripturePieceDraggingService);
  });
});
