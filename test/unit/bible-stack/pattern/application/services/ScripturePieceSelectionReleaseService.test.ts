import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ScripturePieceSelectionReleaseService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ScripturePieceSelectionReleaseService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceDrag";
import type {
  PieceAdapterPort,
  ScripturePieceSelectionReleaseDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/scripturePieceSelectionRelease";

describe("pattern.bible-stack.application.services.ScripturePieceSelectionReleaseService", () => {
  let service: ScripturePieceSelectionReleaseService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;

  beforeEach(() => {
    pieceAdapterPort = {
      isPieceAnchored: vi.fn(),
      releaseSelectionOnPiece: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    service = new ScripturePieceSelectionReleaseService({
      pieceAdapterPort,
      pieceDataRepositoryPort:
        {} as unknown as ScripturePieceSelectionReleaseDataRepositoryPort,
      sequenceStateServicePort,
      pieceHierarchyServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ScripturePieceSelectionReleaseService);
  });
});
