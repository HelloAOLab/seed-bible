import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceHighlightService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceHighlightService";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type {
  HighlightConfigProviderPort,
  PieceHighlightActivityNotificationAdapterPort,
  PieceHighlightActivityServicePort,
  PieceHighlightAdapterPort,
  PieceHighlightEventPort,
  PieceHighlightLabelServicePort,
  PieceHighlightPieceDataRepositoryPort,
  PieceHighlightSequenceStateServicePort,
  PieceUnhighlightSchedulerAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";

describe("pattern.bible-stack.application.services.PieceHighlightService", () => {
  let service: PieceHighlightService;
  let eventPort: Mocked<PieceHighlightEventPort>;
  let pieceHighlightAdapterPort: Mocked<PieceHighlightAdapterPort>;
  let pieceActivityServicePort: Mocked<PieceHighlightActivityServicePort>;
  let pieceLabelServicePort: Mocked<PieceHighlightLabelServicePort>;
  let schedulerAdapterPort: Mocked<PieceUnhighlightSchedulerAdapterPort>;
  let configProviderPort: Mocked<HighlightConfigProviderPort>;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let sequenceStateServicePort: Mocked<PieceHighlightSequenceStateServicePort>;

  beforeEach(() => {
    eventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<PieceHighlightEventPort>;

    pieceHighlightAdapterPort = {
      interruptSequence: vi.fn(),
      highlight: vi.fn(),
      rehighlight: vi.fn(),
      unhighlight: vi.fn(),
      increaseIntensity: vi.fn(),
      decreaseIntensity: vi.fn(),
    };

    pieceActivityServicePort = {
      updateNotification: vi.fn(),
    };

    pieceLabelServicePort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
    };

    schedulerAdapterPort = {
      schedule: vi.fn(),
      clear: vi.fn(),
    };

    configProviderPort = {
      getDelay: vi.fn(),
    };

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(),
    };

    service = new PieceHighlightService({
      eventPort,
      pieceHighlightAdapterPort,
      activityNotificationAdapterPort:
        {} as unknown as PieceHighlightActivityNotificationAdapterPort,
      pieceActivityServicePort,
      pieceLabelServicePort,
      schedulerAdapterPort,
      configProviderPort,
      pieceDataRepositoryPort:
        {} as unknown as PieceHighlightPieceDataRepositoryPort,
      pieceHierarchyServicePort,
      sequenceStateServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceHighlightService);
  });
});
