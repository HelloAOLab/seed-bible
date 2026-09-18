import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { StackStructureService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/StackStructureService";
import type { PieceLifecycleServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLifecycle";
import type {
  PieceAdapterPort,
  StackStructureEventPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/stackStructure";

describe("pattern.bible-stack.application.services.StackStructureService", () => {
  let service: StackStructureService;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let pieceLifecycleServicePort: Mocked<PieceLifecycleServicePort>;
  let stackStructureEventPort: Mocked<StackStructureEventPort>;

  beforeEach(() => {
    pieceAdapterPort = {
      makePieceErasable: vi.fn(),
    };

    pieceLifecycleServicePort = {
      createTestament: vi.fn(),
      createSection: vi.fn(),
      createBook: vi.fn(),
      createChapter: vi.fn(),
      clearPiece: vi.fn(),
    };

    stackStructureEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<StackStructureEventPort>;

    service = new StackStructureService({
      pieceAdapterPort,
      pieceLifecycleServicePort,
      stackStructureEventPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(StackStructureService);
  });
});
