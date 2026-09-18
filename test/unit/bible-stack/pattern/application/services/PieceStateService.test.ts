import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceStateService";
import type { BookChaptersManagementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/BookChaptersManagement";
import type { PieceLabelServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceLabel";
import type {
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceState";

describe("pattern.bible-stack.application.services.PieceStateService", () => {
  let service: PieceStateService;
  let labelPositionUpdaterPort: Mocked<
    PieceLabelServicePort<
      | "StackTestament"
      | "StackSection"
      | "StackBook"
      | "StackSectionBook"
      | "StackChapter"
      | "StackSectionShadow"
    >
  >;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let bookChaptersManagementServicePort: Mocked<BookChaptersManagementServicePort>;
  let activityIndicatorsAdapterPort: Mocked<ActivityIndicatorsAdapterPort>;
  let activityNotificationAdapterPort: Mocked<ActivityNotificationAdapterPort>;

  beforeEach(() => {
    labelPositionUpdaterPort = {
      showLabel: vi.fn(),
      hideLabel: vi.fn(),
      changeIntensity: vi.fn(),
      updateLabelPosition: vi.fn(),
      getPieceLabel: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    bookChaptersManagementServicePort = {
      showChapters: vi.fn(),
      hideChapters: vi.fn(),
      updateChaptersPosition: vi.fn(),
    };

    activityIndicatorsAdapterPort = {
      updateIndicatorsPosition: vi.fn(),
    };

    activityNotificationAdapterPort = {
      updateNotificationPosition: vi.fn(),
    };

    service = new PieceStateService({
      labelPositionUpdaterPort,
      pieceDataRepositoryPort,
      bookChaptersManagementServicePort,
      activityIndicatorsAdapterPort,
      activityNotificationAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceStateService);
  });
});
