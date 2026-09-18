import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ExperienceService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/ExperienceService";
import type {
  BibleLifecycleServicePort,
  BibleSequenceServicePort,
  CameraAdapterPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/bibleLifecycle";
import type {
  AwaiterPort,
  EnvironmentAdapterPort,
  ExperienceAdapterPort,
  ExperienceConfigProviderPort,
  InteractionRegistryServicePort,
  SequenceStateServicePort,
  StackManagementService,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/experience";
import type { PieceActivityServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceActivity";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { ScripturePiecesStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ScripturePiecesState";
import type { StackPresenceNavigationServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/StackPresenceNavigation";

describe("pattern.bible-stack.application.services.ExperienceService", () => {
  let service: ExperienceService;
  let environmentAdapterPort: Mocked<EnvironmentAdapterPort>;
  let stackManagementServicePort: Mocked<StackManagementService>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let interactionRegistryServicePort: Mocked<InteractionRegistryServicePort>;
  let experienceAdapterPort: Mocked<ExperienceAdapterPort>;
  let scripturePiecesStateServicePort: Mocked<ScripturePiecesStateServicePort>;
  let experienceConfigProviderPort: Mocked<ExperienceConfigProviderPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let cameraAdapterPort: Mocked<CameraAdapterPort>;
  let bibleLifecycleServicePort: Mocked<BibleLifecycleServicePort>;
  let bibleSequenceServicePort: Mocked<BibleSequenceServicePort>;
  let stackPresenceNavigationServicePort: Mocked<StackPresenceNavigationServicePort>;
  let awaiterPort: Mocked<AwaiterPort>;
  let pieceActivityServicePort: Mocked<PieceActivityServicePort>;

  beforeEach(() => {
    environmentAdapterPort = {
      resetZoomMin: vi.fn(),
    };

    stackManagementServicePort = {
      clearAllStacks: vi.fn(),
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

    interactionRegistryServicePort = {
      clearAllLastInteractions: vi.fn(),
    };

    experienceAdapterPort = {
      displayExperience: vi.fn(),
    };

    scripturePiecesStateServicePort = {
      arePiecesDraggable:
        undefined as unknown as ScripturePiecesStateServicePort["arePiecesDraggable"],
      shouldShowLabelDates:
        undefined as unknown as ScripturePiecesStateServicePort["shouldShowLabelDates"],
      resetToDefault: vi.fn(),
      makePiecesDraggable: vi.fn(),
      makePiecesNotDraggable: vi.fn(),
      enableLabelDates: vi.fn(),
      disableLabelDates: vi.fn(),
    };

    experienceConfigProviderPort = {
      getInitialBibleCreationDelay: vi.fn(),
      getBibleCreationPosition: vi.fn(),
    };

    sequenceStateServicePort = {
      executeAsSequence: vi.fn(),
    };

    cameraAdapterPort = {
      focusOn: vi.fn(),
      cancelFocus: vi.fn(),
    };

    bibleLifecycleServicePort = {
      createBible: vi.fn(),
    };

    bibleSequenceServicePort = {
      crackOpenBible: vi.fn(),
    };

    stackPresenceNavigationServicePort = {
      update: vi.fn(),
    };

    awaiterPort = {
      sleep: vi.fn(),
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

    service = new ExperienceService({
      environmentAdapterPort,
      stackManagementServicePort,
      pieceHighlightServicePort,
      interactionRegistryServicePort,
      experienceAdapterPort,
      scripturePiecesStateServicePort,
      experienceConfigProviderPort,
      sequenceStateServicePort,
      cameraAdapterPort,
      bibleLifecycleServicePort,
      bibleSequenceServicePort,
      stackPresenceNavigationServicePort,
      awaiterPort,
      pieceActivityServicePort,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(ExperienceService);
  });
});
