import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceActivityService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceActivityService";
import type { ArrangementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Arrangement";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { UserPresencePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/UserPresence";
import type {
  ActivityIndicatorLifecyclePort,
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  DataRegistryPort,
  IdGeneratorPort,
  LabelDataStorePort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceActivity";
import type { UserIdentityPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/UserIdentity";
import type { BaseEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BaseEventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";

describe("pattern.bible-stack.application.services.PieceActivityService", () => {
  let service: PieceActivityService;
  let dataRegistryPort: Mocked<DataRegistryPort>;
  let arrangementServicePort: Mocked<ArrangementServicePort>;
  let labelDataStorePort: Mocked<LabelDataStorePort>;
  let userPresenceServicePort: Mocked<UserPresencePort>;
  let activityIndicatorsAdapterPort: Mocked<ActivityIndicatorsAdapterPort>;
  let activityIndicatorLifecyclePort: Mocked<ActivityIndicatorLifecyclePort>;
  let activityNotificationAdapterPort: Mocked<ActivityNotificationAdapterPort>;
  let userIdentityStorePort: Mocked<UserIdentityPort>;
  let idGeneratorPort: Mocked<IdGeneratorPort>;
  let loggerPort: Mocked<LoggerPort>;
  let eventBus: Mocked<BaseEventManager<BibleStackEvents>>;

  beforeEach(() => {
    dataRegistryPort = {
      getDataById: vi.fn(),
      getPieceData: vi.fn(),
      getAllPiecesDataByType: vi.fn(),
    } as unknown as Mocked<DataRegistryPort>;

    arrangementServicePort = {
      getArrangementByIndex: vi.fn(),
      getAllArrangements: vi.fn(),
      getCurrentArrangementIndex: vi.fn(),
      setCurrentArrangementIndex: vi.fn(),
      setArrangementIndexByName: vi.fn(),
      getArrangementIndexByName: vi.fn(),
      getCurrentArrangement: vi.fn(),
      getCurrentArrangementName: vi.fn(),
      addCustomArrangement: vi.fn(),
      removeCustomArrangement: vi.fn(),
      getBooksNamesBySectionName: vi.fn(),
      getBookInfoPathById: vi.fn(),
      getBookByIndices: vi.fn(),
      getTestamentByIndices: vi.fn(),
      getBookSubsetByCompleteId: vi.fn(),
      getSectionByIndices: vi.fn(),
    };

    labelDataStorePort = {
      getDataByTransformerId: vi.fn(),
      getDataByTailId: vi.fn(),
      getDataByTextId: vi.fn(),
      addLabelData: vi.fn(),
      removeLabelData: vi.fn(),
      getAllLabelsData: vi.fn(),
      getDataByOwnerId: vi.fn(),
    };

    userPresenceServicePort = {
      update: vi.fn(),
      getUserPresence: vi.fn(),
      getOwnConnectionId: vi.fn(),
      getOwnUserPresence: vi.fn(),
      getRemotesUserPresnece: vi.fn(),
      getOwnUserSelectedInstance: vi.fn(),
    };

    activityIndicatorsAdapterPort = {
      showIndicators: vi.fn(),
      hideIndicators: vi.fn(),
      hideIndicator: vi.fn(),
      updateIndicatorsPosition: vi.fn(),
    };

    activityIndicatorLifecyclePort = {
      spawnActivityIndicatorDomain: vi.fn(),
    };

    activityNotificationAdapterPort = {
      hideNotification: vi.fn(),
      showNotification: vi.fn(),
      updateNotificationPosition: vi.fn(),
      updateNotificationDirection: vi.fn(),
    };

    userIdentityStorePort = {
      getUserDataByIds: vi.fn(),
    };

    idGeneratorPort = {
      getId: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    eventBus = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as Mocked<BaseEventManager<BibleStackEvents>>;

    service = new PieceActivityService({
      dataRegistryPort,
      arrangementServicePort,
      labelDataStorePort,
      maxIndicators: 0,
      userPresenceServicePort,
      activityIndicatorsAdapterPort,
      activityIndicatorLifecyclePort,
      activityNotificationAdapterPort,
      userIdentityStorePort,
      idGeneratorPort,
      loggerPort,
      eventBus,
    });
  });

  it("is constructed with its ports wired", () => {
    expect(service).toBeInstanceOf(PieceActivityService);
  });
});
