import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ChapterSelectionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ChapterSelectionService";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { PieceActivityServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceActivity";
import type {
  ChapterSelectionAdapterPort,
  LabelManagerPort,
  VersesBundleLifecycleAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ChapterSelection";

describe("pattern.bible-stack.application.services.ChapterSelectionService", () => {
  let service: ChapterSelectionService;
  let loggerPort: Mocked<LoggerPort>;
  let chapterSelectionAdapterPort: Mocked<ChapterSelectionAdapterPort>;
  let pieceActivityServicePort: Mocked<PieceActivityServicePort>;
  let labelManagerPort: Mocked<LabelManagerPort>;
  let versesBundleLifecycleAdapterPort: Mocked<VersesBundleLifecycleAdapterPort>;

  beforeEach(() => {
    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    chapterSelectionAdapterPort = {
      select: vi.fn(),
      deselect: vi.fn(),
    };

    pieceActivityServicePort = {
      getPieceActivity: vi.fn(),
      getActivityIndicatorsForPiece: vi.fn(),
      getActivityIndicatorByType: vi.fn(),
      getExtraActivityIndicatorsForPiece: vi.fn(),
      getPieceIndicatorByActivityIndex: vi.fn(),
      getDataActivityIndicatorByType: vi.fn(),
      getDataExtraActivityIndicators: vi.fn(),
      getDataIndicatorByActivityIndex: vi.fn(),
      tryHideIndicators: vi.fn(),
      updateIndicators: vi.fn(),
      updateAllIndicators: vi.fn(),
      tryHideNotification: vi.fn(),
      updateNotification: vi.fn(),
      updateAllNotifications: vi.fn(),
      updateAllNotificationsDirection: vi.fn(),
    };

    labelManagerPort = {
      hideLabel: vi.fn(),
    };

    versesBundleLifecycleAdapterPort = {
      spawnVersesBundleDomain: vi.fn(),
      despawnVersesBundle: vi.fn(),
      despawnVerse: vi.fn(),
    };

    service = new ChapterSelectionService({
      loggerPort,
      chapterSelectionAdapterPort,
      pieceActivityServicePort,
      labelManagerPort,
      versesBundleLifecycleAdapterPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ChapterSelectionService);
  });
});
