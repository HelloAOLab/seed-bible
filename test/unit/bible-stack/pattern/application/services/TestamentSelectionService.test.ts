import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TestamentSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TestamentSelectionService";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { SectionSpawnerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type {
  AwaiterPort,
  LabelSequenceConfigProviderPort,
  PieceAdapterPort,
  TestamentSelectionAdapterPort,
  TestamentSelectionEventPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/TestamentSelection";

describe("pattern.bible-stack.application.services.TestamentSelectionService", () => {
  let service: TestamentSelectionService;
  let testamentSelectionAdapterPort: Mocked<TestamentSelectionAdapterPort>;
  let testamentSelectionEventPort: Mocked<TestamentSelectionEventPort>;
  let pieceHighlighterPort: Mocked<PieceHighlighterPort>;
  let sectionSpawnerPort: Mocked<SectionSpawnerPort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let awaiterPort: Mocked<AwaiterPort>;
  let labelSequenceConfigProviderPort: Mocked<LabelSequenceConfigProviderPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;

  beforeEach(() => {
    testamentSelectionAdapterPort = {
      select: vi.fn(),
    };

    testamentSelectionEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<TestamentSelectionEventPort>;

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

    sectionSpawnerPort = {
      spawnSectionDomain: vi.fn(),
      spawnSectionBookDomain: vi.fn(),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
    };

    awaiterPort = {
      sleep: vi.fn(),
    };

    labelSequenceConfigProviderPort = {
      getShowSequenceDurationSeconds: vi.fn(),
    };

    pieceAdapterPort = {
      makeInteractable: vi.fn(),
    };

    service = new TestamentSelectionService({
      testamentSelectionAdapterPort,
      testamentSelectionEventPort,
      pieceHighlighterPort,
      sectionSpawnerPort,
      stackUpdateServicePort,
      awaiterPort,
      labelSequenceConfigProviderPort,
      pieceAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(TestamentSelectionService);
  });
});
