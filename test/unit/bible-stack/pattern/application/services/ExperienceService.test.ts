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
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { WorldPosition } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/spatial";

const BIBLE_ID = "bible-id";
const CREATION_DELAY = 750;

const creationPosition: WorldPosition = { x: 1, y: 2, z: 3 };

const makeBibleData = (): StackBibleData =>
  new StackBibleData({
    id: BIBLE_ID,
    childrenData: [],
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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
  let bibleData: StackBibleData;

  const orderOf = (mock: { mock: { invocationCallOrder: number[] } }) =>
    mock.mock.invocationCallOrder[0]!;

  beforeEach(() => {
    bibleData = makeBibleData();

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
      getInitialBibleCreationDelay: vi.fn(() => CREATION_DELAY),
      getBibleCreationPosition: vi.fn(() => creationPosition),
    };

    sequenceStateServicePort = {
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    };

    cameraAdapterPort = {
      focusOn: vi.fn(),
      cancelFocus: vi.fn(),
    };

    bibleLifecycleServicePort = {
      createBible: vi.fn(() => ({ bibleData })),
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

  describe("displayExperience", () => {
    it("successfully displays the experience", async () => {
      await service.displayExperience();
      await flush();

      expect(experienceAdapterPort.displayExperience).toHaveBeenCalledOnce();
      expect(orderOf(experienceAdapterPort.displayExperience)).toBeLessThan(
        orderOf(awaiterPort.sleep)
      );
      expect(bibleLifecycleServicePort.createBible).toHaveBeenCalledOnce();
      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
    });

    it("awaits the provided delay after displaying the experience", async () => {
      const sleeping = makeDeferred();
      awaiterPort.sleep.mockReturnValue(sleeping.promise);

      const displaying = service.displayExperience();
      await flush();

      expect(awaiterPort.sleep).toHaveBeenCalledExactlyOnceWith(CREATION_DELAY);
      expect(experienceAdapterPort.displayExperience).toHaveBeenCalledOnce();
      expect(bibleLifecycleServicePort.createBible).not.toHaveBeenCalled();
      expect(cameraAdapterPort.focusOn).not.toHaveBeenCalled();

      sleeping.resolve();
      await displaying;

      expect(
        bibleLifecycleServicePort.createBible
      ).toHaveBeenCalledExactlyOnceWith({
        position: creationPosition,
        type: BibleTypes.Default,
      });
    });

    it("synchronously performs a camera focus before executing the crack open sequence", async () => {
      cameraAdapterPort.focusOn.mockReturnValue(makeDeferred().promise);

      void service.displayExperience();
      await flush();

      expect(cameraAdapterPort.focusOn).toHaveBeenCalledExactlyOnceWith(
        creationPosition,
        "bibleSetup"
      );
      expect(orderOf(cameraAdapterPort.focusOn)).toBeLessThan(
        orderOf(sequenceStateServicePort.executeAsSequence)
      );
      expect(bibleSequenceServicePort.crackOpenBible).toHaveBeenCalledOnce();
      expect(
        pieceActivityServicePort.updateAllNotifications
      ).toHaveBeenCalledOnce();
    });

    it("performs the crack open bible animation, presence navigation update and notifications update as a complete sequence", async () => {
      await service.displayExperience();
      await flush();

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(
        bibleSequenceServicePort.crackOpenBible
      ).toHaveBeenCalledExactlyOnceWith(bibleData);
      expect(stackPresenceNavigationServicePort.update).toHaveBeenCalledOnce();
      expect(
        pieceActivityServicePort.updateAllNotifications
      ).toHaveBeenCalledOnce();
      expect(orderOf(bibleSequenceServicePort.crackOpenBible)).toBeGreaterThan(
        orderOf(sequenceStateServicePort.executeAsSequence)
      );
      expect(
        orderOf(stackPresenceNavigationServicePort.update)
      ).toBeGreaterThan(orderOf(bibleSequenceServicePort.crackOpenBible));
      expect(
        orderOf(pieceActivityServicePort.updateAllNotifications)
      ).toBeGreaterThan(orderOf(stackPresenceNavigationServicePort.update));
    });

    it("awaits for the crack open bible animation before executing the presence navigation update", async () => {
      const cracking = makeDeferred();
      bibleSequenceServicePort.crackOpenBible.mockReturnValue(cracking.promise);

      await service.displayExperience();
      await flush();

      expect(bibleSequenceServicePort.crackOpenBible).toHaveBeenCalledOnce();
      expect(stackPresenceNavigationServicePort.update).not.toHaveBeenCalled();

      cracking.resolve();
      await flush();

      expect(stackPresenceNavigationServicePort.update).toHaveBeenCalledOnce();
    });

    it("awaits for the presence navigation update before executing the notifications update", async () => {
      const navigating = makeDeferred();
      stackPresenceNavigationServicePort.update.mockReturnValue(
        navigating.promise
      );

      await service.displayExperience();
      await flush();

      expect(stackPresenceNavigationServicePort.update).toHaveBeenCalledOnce();
      expect(
        pieceActivityServicePort.updateAllNotifications
      ).not.toHaveBeenCalled();

      navigating.resolve();
      await flush();

      expect(
        pieceActivityServicePort.updateAllNotifications
      ).toHaveBeenCalledOnce();
    });
  });

  describe("clearExperience", () => {
    it("resets the minimum camera zoom", () => {
      service.clearExperience();

      expect(environmentAdapterPort.resetZoomMin).toHaveBeenCalledOnce();
    });

    it("clears all stacks", () => {
      service.clearExperience();

      expect(stackManagementServicePort.clearAllStacks).toHaveBeenCalledOnce();
    });

    it("clears scheduled unhighlights", () => {
      service.clearExperience();

      expect(
        pieceHighlightServicePort.clearScheduledUnhighlights
      ).toHaveBeenCalledOnce();
    });

    it("clears highlighted pieces", () => {
      service.clearExperience();

      expect(
        pieceHighlightServicePort.clearHighlightedPieces
      ).toHaveBeenCalledOnce();
      expect(
        orderOf(pieceHighlightServicePort.clearHighlightedPieces)
      ).toBeGreaterThan(
        orderOf(pieceHighlightServicePort.clearScheduledUnhighlights)
      );
    });

    it("clears all last interactions", () => {
      service.clearExperience();

      expect(
        interactionRegistryServicePort.clearAllLastInteractions
      ).toHaveBeenCalledOnce();
    });

    it("resets scripture pieces state to default", () => {
      service.clearExperience();

      expect(
        scripturePiecesStateServicePort.resetToDefault
      ).toHaveBeenCalledOnce();
    });
  });
});
