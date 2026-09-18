import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ExplodedViewService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ExplodedVIewService";
import type { PieceActivityServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceActivity";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { StackUpdateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackUpdate";
import type { ExplodedViewEventPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ExplodedView";

describe("pattern.bible-stack.application.services.ExplodedVIewService", () => {
  let service: ExplodedViewService;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let stackUpdateServicePort: Mocked<StackUpdateServicePort>;
  let pieceActivityServicePort: Mocked<PieceActivityServicePort>;
  let bibleStackEventPort: Mocked<ExplodedViewEventPort>;

  beforeEach(() => {
    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(),
    };

    stackUpdateServicePort = {
      updateAllStacks: vi.fn(),
      updateStack: vi.fn(),
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

    bibleStackEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<ExplodedViewEventPort>;

    service = new ExplodedViewService({
      pieceHierarchyServicePort,
      stackUpdateServicePort,
      pieceActivityServicePort,
      bibleStackEventPort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ExplodedViewService);
  });
});
