import { ScriptureService } from "../../application/services/ScriptureService";
import { BibleVizDataRepository } from "../data/BibleVizDataRepository";
import { ReadingHistoryService } from "../../application/services/ReadingHistoryService";
import { SessionService } from "../../application/services/SessionService";
import { ArrangementService } from "../../application/services/ArrangementService";
import { PieceActivityService } from "../../application/services/PieceActivityService";
import { PieceDataRegistry } from "../../application/services/PieceDataRegistry";
import { UserPresenceService } from "../../application/services/UserPresenceService";
import { BaseEventManager } from "../../application/services/BaseEventManager";
import type { BibleVizUtilsEvents } from "../../domain/models/events";
import { LabelDateService } from "../../application/services/LabelDateService";
import { UserColorSyncService } from "../../application/services/UserColorSyncService";
import { PieceLabelService } from "../../application/services/PieceLabelService";
import { LabelInteractionService } from "../../application/services/LabelInteractionService";

import { SeedBiblePresenceProvider } from "../adapters/userPresence/SeedBiblePresenceProvider";
import { ActivityIndicatorsAdapter } from "../adapters/pieceActivity/ActivityIndicatorsAdapter";
import { ActivityNotificationAdapter } from "../adapters/pieceActivity/ActivityNotificationAdapter";
import { LabelDataStore } from "../adapters/labels/LabelDataStore";
import { UserColorStore } from "../adapters/userPresence/UserColorStore";
import { SessionProvider } from "../adapters/session/SessionProvider";
import { UserDatabase } from "../adapters/user/UserDatabase";
import {
  ObjectPooler,
  type ObjectPoolerConfig,
  type DimensionGetter as ObjectPoolerDimensionGetter,
} from "../adapters/casualos/ObjectPooler";
import { LabelAdapter } from "../adapters/labels/LabelAdapter";

import { UserColorController } from "../controllers/session/UserColorController";
import { SessionController } from "../controllers/session/SessionController";
import { ArrangementController } from "../controllers/arrangement/ArrangementController";
import { UserPresenceController } from "../controllers/userPresence/UserPresenceController";
import { LabelInteractionController } from "../controllers/label/LabelInteractionController";
import type {
  BibleVizUtilsObjectPoolerMap,
  PieceBotTags,
  PoolData,
  TypedBot,
} from "../models/casualos";

import { thisTypedBot as activityNotificationPrefab } from "../prefabs/activityNotification/botAdapter";
import { thisTypedBot as activityIndicatorPrefab } from "../prefabs/activityIndicator/botAdapter";
import { thisTypedBot as infoLabelTransformerPrefab } from "../prefabs/infoLabelTransformer/botAdapter";
import { thisTypedBot as infoLabelDatePrefab } from "../prefabs/infoLabelDate/botAdapter";
import { thisTypedBot as infoLabelTailPrefab } from "../prefabs/infoLabelTail/botAdapter";
import { thisTypedBot as infoLabelTextPrefab } from "../prefabs/infoLabelText/botAdapter";
import type { PieceLabelServiceParams } from "../../domain/ports/label";
import { BiblePiece, type BiblePieceType } from "../../domain/models/canvas";
import { CustomArrangementStore } from "../adapters/arrangement/CustomArrangementStore";
import { LabelFeedbackAdapter } from "../adapters/labels/LabelFeedbackAdapter";
import { ArrangementsConfigProvider } from "../config/arrangements/ArrangementsConfigProvider";
import { ArrangementAdapter } from "../adapters/arrangement/ArrangementAdapter";
import { LabelsConfigProvider } from "../config/labels/LabelsConfigProvider";
import { ActivityIndicatorBotsRepository } from "../adapters/pieceActivity/ActivityIndicatorBotsRepository";
import { ActivityIndicatorsConfigProvider } from "../config/activityIndicators/ActivityIndicatorsConfigProvider";
import { LabelFeedbackConfigProvider } from "../config/labels/LabelFeedbackConfigProvider";
import { ConsoleLoggerAdapter } from "../adapters/logger/ConsoleLoggerAdapter";
import { BookInfoMapper } from "../mappers/BookInfoMapper";
import { SectionInfoMapper } from "../mappers/SectionInfoMapper";
import { PieceMapper } from "../mappers/PieceMapper";
import { ActivityIndicatorMapper } from "../mappers/ActivityIndicatorMapper";
import { InfoLabelTextMapper } from "../mappers/InfoLabelTextMapper";
import { InfoLabelTailMapper } from "../mappers/InfoLabelTailMapper";
import { InfoLabelDateMapper } from "../mappers/InfoLabelDateMapper";
import { InfoLabelTransformerMapper } from "../mappers/InfoLabelTransformerMapper";
import {
  GetTextColorBasedOnBackground,
  ComputeRawGradientColors,
  ComputeLinearGradient,
  HexToRgb,
  RgbToHex,
  GetChildrenLevelColors,
  GetColorType,
  RGBStringToArray,
  HexLongToShort,
  HexShortToLong,
  ColorParser,
} from "../../domain/functions/colors";
import { IsValueBetween } from "../../domain/functions/math";
import type { BibleVizAPI } from "../models/seedBible";
import { registerExtension, type SeedBibleState } from "seed-bible";
import {
  GetDayRangeSeconds,
  GetPastDateInfo,
} from "../../domain/functions/time";
import { CapitalizeFirstLetter } from "../../domain/functions/string";
import { ScriptureMap3DConfigProvider } from "../config/scriptureMap3D/ScriptureMap3DConfigProvider";
import { ReadingHistoryConfigProvider } from "../config/readingHistory/ReadingHistoryConfigProvider";
import { entrypoints } from "../entrypoints/casualos/botProvider";
import { connectedUserColors } from "../../../../seed-bible/seed-bible/managers/SessionsManager";
import { effect, signal } from "@preact/signals";
import { RadingInstanceProvider } from "../adapters/userPresence/ReadingInstanceProvider";
import { ReadingHistoryTimeline } from "../presentation/components/ui/ReadingHistoryTimeline";
import { getReadingHistoryTimelineStyles } from "../presentation/styles/adapter";
import { useHorizontalScroll } from "../presentation/hooks/useHorizontalScroll";
import { StackConfigProvider } from "../config/stacks/StackConfigProvider";

export let userColorController: UserColorController | undefined = undefined;
export let sessionController: SessionController | undefined = undefined;
export let arrangementController: ArrangementController | undefined = undefined;
export let userPresenceController: UserPresenceController | undefined =
  undefined;
export let labelInteractionController: LabelInteractionController | undefined =
  undefined;

export const bootstrapExtension = () => {
  registerExtension({
    id: "bible-visualization-utils",
    init: function* (context: SeedBibleState) {
      // 1. Instantiating adapters

      const stackConfigProvider = new StackConfigProvider();
      const readingHistoryConfigProvider = new ReadingHistoryConfigProvider();
      const scriptureMap3DConfigProvider = new ScriptureMap3DConfigProvider();
      const infoLabelTextPool: PoolData<
        "InfoLabelText",
        BibleVizUtilsObjectPoolerMap["InfoLabelText"]
      > = {
        key: BiblePiece.InfoLabelText,
        prefab: infoLabelTextPrefab,
        customTags: {
          isInfoLabelTextPrefab: false,
          system: undefined,
        },
        cleanupCustomTags: {
          transformer: undefined,
          ownerBotId: undefined,
          onBotChanged: undefined,
        },
        size: 8,
      };
      const infoLabelTailPool: PoolData<
        "InfoLabelTail",
        BibleVizUtilsObjectPoolerMap["InfoLabelTail"]
      > = {
        key: BiblePiece.InfoLabelTail,
        prefab: infoLabelTailPrefab,
        customTags: {
          isInfoLabelTailPrefab: false,
          system: undefined,
        },
        cleanupCustomTags: {
          transformer: undefined,
          ownerBotId: undefined,
        },
        size: 8,
      };
      const infoLabelDatePool: PoolData<
        "InfoLabelDate",
        BibleVizUtilsObjectPoolerMap["InfoLabelDate"]
      > = {
        key: BiblePiece.InfoLabelDate,
        prefab: infoLabelDatePrefab,
        customTags: {
          isInfoLabelDatePrefab: true,
          system: undefined,
        },
        cleanupCustomTags: {
          transformer: undefined,
          ownerBotId: undefined,
        },
        size: 8,
      };
      const infoLabelTransformerPool: PoolData<
        "InfoLabelTransformer",
        BibleVizUtilsObjectPoolerMap["InfoLabelTransformer"]
      > = {
        key: BiblePiece.InfoLabelTransformer,
        prefab: infoLabelTransformerPrefab,
        customTags: {
          isInfoLabelTransformerPrefab: false,
          system: undefined,
        },
        cleanupCustomTags: {
          ownerBotId: undefined,
          ownerDataId: undefined,
          pointableDefault: undefined,
        },
        size: 8,
      };
      const activityIndicatorPool: PoolData<
        "ActivityIndicator",
        BibleVizUtilsObjectPoolerMap["ActivityIndicator"]
      > = {
        key: BiblePiece.ActivityIndicator,
        prefab: activityIndicatorPrefab,
        customTags: {
          isActivityIndicatorPrefab: false,
          isActivityIndicator: true,
          system: undefined,
        },
        cleanupCustomTags: {
          transformer: undefined,
          ownerBotId: undefined,
          ownerDataId: undefined,
          initialPosition: undefined,
          label: undefined,
          labelOpacity: 1,
          formOpacity: 1,
          formRenderOrder: undefined,
          index: undefined,
          targetOpacity: 1,
        },
        size: 8,
      };
      const activityNotificationPool: PoolData<
        "ActivityNotification",
        BibleVizUtilsObjectPoolerMap["ActivityNotification"]
      > = {
        key: BiblePiece.ActivityNotification,
        prefab: activityNotificationPrefab,
        customTags: {
          isActivityNotificationPrefab: false,
          system: undefined,
        },
        cleanupCustomTags: {
          ownerBotId: undefined,
          formOpacity: 1,
          direction: undefined,
          offset: undefined,
          scaleX: 0.3,
          scaleY: 0.3,
        },
        size: 5,
      };

      const bibleVizUtilsObjectPooler =
        new ObjectPooler<BibleVizUtilsObjectPoolerMap>(
          [
            activityIndicatorPool,
            activityNotificationPool,
            infoLabelTransformerPool,
            infoLabelDatePool,
            infoLabelTailPool,
            infoLabelTextPool,
          ],
          { getDimension: () => os.getCurrentDimension() }
        );
      const activityIndicatorsConfigProvider =
        new ActivityIndicatorsConfigProvider();
      const labelFeedbackConfigProvider = new LabelFeedbackConfigProvider();
      const activityIndicatorBotsRepository =
        new ActivityIndicatorBotsRepository();
      const bibleVizUtilsEventManager =
        new BaseEventManager<BibleVizUtilsEvents>();
      const seedBiblePresenceProvider = new SeedBiblePresenceProvider({
        state: context,
      });
      const activityIndicatorMapper = new ActivityIndicatorMapper();
      const pieceMapper = new PieceMapper();
      const infoLabelTextMapper = new InfoLabelTextMapper({
        pieceMapperPort: pieceMapper,
      });
      const infoLabelTailMapper = new InfoLabelTailMapper({
        pieceMapperPort: pieceMapper,
      });
      const infoLabelDateMapper = new InfoLabelDateMapper({
        pieceMapperPort: pieceMapper,
      });
      const infoLabelTransformerMapper = new InfoLabelTransformerMapper({
        pieceMapperPort: pieceMapper,
      });
      const dimensionProviderPort = {
        getDimension: () => os.getCurrentDimension(),
      };
      const activityIndicatorsAdapter = new ActivityIndicatorsAdapter({
        objectPooler: bibleVizUtilsObjectPooler,
        botsRepositoryPort: activityIndicatorBotsRepository,
        configProviderPort: activityIndicatorsConfigProvider,
        activityIndicatorMapperPort: activityIndicatorMapper,
        labelTextMapperPort: infoLabelTextMapper,
        dimensionProviderPort,
      });
      const activityNotificationAdapter = new ActivityNotificationAdapter({
        objectPooler: bibleVizUtilsObjectPooler,
        dimensionProviderPort,
        pieceMapperPort: pieceMapper,
      });
      const labelDataStore = new LabelDataStore({});
      const userColorStore = new UserColorStore(bibleVizUtilsEventManager);
      const sessionProvider = new SessionProvider({
        state: context,
        colors: [
          ...connectedUserColors, // TODO: Get the complete color array from one place and avoid hardcoding the values here.
          "#06B6D4",
          "#EC4899",
          "#8B5CF6",
          "#14B8A6",
        ],
        icons: [
          "forest", // tree
          "park", // log
          "eco", // leaf
          "pets", // cat/dog
          "cruelty_free", // bunny-style
          "local_cafe", // coffee
          "local_florist", // flower
          "grass", // grass
          "potted_plant", // plant
          "nature", // mountain/tree
        ],
      });
      const userDatabase = new UserDatabase();
      const labelsConfigProvider = new LabelsConfigProvider();
      const labelAdapter = new LabelAdapter({
        objectPooler: bibleVizUtilsObjectPooler,
        labelConfigProviderPort: labelsConfigProvider,
        dimensionProviderPort,
        infoLabelTextMapperPort: infoLabelTextMapper,
        pieceMapperPort: pieceMapper,
        infoLabelTransformerMapperPort: infoLabelTransformerMapper,
        infoLabelTailMapperPort: infoLabelTailMapper,
        infoLabelDateMapperPort: infoLabelDateMapper,
      });
      const bibleVizDataRepository = new BibleVizDataRepository();
      const arrangementAdapter = new ArrangementAdapter();
      const customArrangementStore = new CustomArrangementStore({
        arrangementAdapterPort: arrangementAdapter,
      });
      const arrangementsConfigProvider = new ArrangementsConfigProvider(
        arrangementAdapter
      );
      const bookInfoMapper = new BookInfoMapper({
        arrangementConfigProviderPort: arrangementsConfigProvider,
        customArrangementStorePort: customArrangementStore,
        booksStaticInfoRepository: bibleVizDataRepository,
      });
      const sectionInfoMapper = new SectionInfoMapper({
        bookInfoMapper,
        arrangementConfigProviderPort: arrangementsConfigProvider,
        customArrangementStorePort: customArrangementStore,
      });
      arrangementAdapter.setSectionInfoMapperPort(sectionInfoMapper);
      const labelAnimationAdapter = new LabelFeedbackAdapter({
        dimensionProvider: () => os.getCurrentDimension(),
        labelFeedbackConfigProviderPort: labelFeedbackConfigProvider,
        infoLabelTextMapperPort: infoLabelTextMapper,
        activityIndicatorMapperPort: activityIndicatorMapper,
        infoLabelTransformerMapperPort: infoLabelTransformerMapper,
        infoLabelTailMapperPort: infoLabelTailMapper,
        infoLabelDateMapperPort: infoLabelDateMapper,
      });
      const readingInstanceProvider = new RadingInstanceProvider({
        state: context,
        sessionProviderPort: sessionProvider,
      });

      // 2. Instantiating services

      const pieceDataRegistry = new PieceDataRegistry();
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      tenDaysAgo.setHours(0, 0, 0, 0);
      const tenDaysAgoTimeSeconds = Math.floor(tenDaysAgo.getTime() / 1000);
      const readingHistoryService = new ReadingHistoryService(
        tenDaysAgoTimeSeconds
      );
      const sessionService = new SessionService(bibleVizUtilsEventManager);
      const arrangementService = new ArrangementService({
        arrangementConfigProviderPort: arrangementsConfigProvider,
        eventManager: bibleVizUtilsEventManager,
        customArrangementStorePort: customArrangementStore,
      });
      const scriptureService = new ScriptureService(
        bibleVizDataRepository,
        arrangementService
      );
      const userPresenceService = new UserPresenceService({
        userPresenceEventPort: bibleVizUtilsEventManager,
        userPresenceProviderPort: seedBiblePresenceProvider,
      });
      const pieceActivityService = new PieceActivityService({
        dataRegistryPort: pieceDataRegistry,
        indicatorsRepositoryPort: activityIndicatorsAdapter,
        arrangementServicePort: arrangementService,
        scriptureServicePort: scriptureService,
        labelDataStorePort: labelDataStore,
        userPresenceServicePort: userPresenceService,
        activityIndicatorsAdapterPort: activityIndicatorsAdapter,
        activityNotificationAdapterPort: activityNotificationAdapter,
        userColorStorePort: userColorStore,
        readingInstanceProviderPort: readingInstanceProvider,
        loggerPort: new ConsoleLoggerAdapter(),
      });
      const labelDateService = new LabelDateService({
        eventPort: bibleVizUtilsEventManager,
      });
      const userColorSyncService = new UserColorSyncService({
        sessionProviderPort: sessionProvider,
        userDatabasePort: userDatabase,
        userColorStorePort: userColorStore,
      });
      const labelInteractionService = new LabelInteractionService({
        labelInteractionEventPort: bibleVizUtilsEventManager,
        labelDataStorePort: labelDataStore,
      });

      // 3. Instantiating controllers

      userColorController = new UserColorController(userColorSyncService);
      sessionController = new SessionController(sessionService);
      arrangementController = new ArrangementController(arrangementService);
      userPresenceController = new UserPresenceController(userPresenceService);
      labelInteractionController = new LabelInteractionController({
        labelInteractionServicePort: labelInteractionService,
        infoLabelTextMapperPort: infoLabelTextMapper,
        infoLabelTailMapperPort: infoLabelTailMapper,
      });

      // 4. Event wiring

      const unsubscribeUserPresenceUpdate = bibleVizUtilsEventManager.subscribe(
        "OnUserPresenceUpdate",
        () => {
          pieceActivityService.updateAllIndicators();
          pieceActivityService.updateAllNotifications();
        }
      );
      const onAnyBotsAddedListener = ({ bots }: { bots: Bot[] }) => {
        sessionController?.handleAnyBotsAdded(bots);
      };
      os.addBotListener(entrypoints, "onAnyBotsAdded", onAnyBotsAddedListener);
      sessionService.tryEmitUserLoggedInEvent(!!authBot);
      const unsubscribeLogin = context.login.userId.subscribe(() => {
        userColorController?.handleUserLogin();
      });
      const connectedUsers = signal(
        context.tabs.tabs.value.flatMap(
          (tab) => tab.sharedSession?.connectedUsers.value ?? []
        )
      );
      const unsubscribeOnlineUsersChanged = effect(() => {
        connectedUsers.value = context.tabs.tabs.value.flatMap((tab) => {
          return tab.sharedSession?.connectedUsers.value ?? [];
        });
        userColorController?.handleOnlineUsersChanged();
        sessionController?.handleOnlineUsersChanged();
      });
      const unsubscribeCurrentReadingStateChanged = effect(() => {
        // eslint-disable-next-line
        const id = context.tabs.selectedTabId.value;
        // eslint-disable-next-line
        const book =
          context.app.currentReadingState.value?.tab.readingState.bookId.value;
        // eslint-disable-next-line
        const chapter =
          context.app.currentReadingState.value?.tab.readingState.chapterNumber
            .value;
        userPresenceController?.handleActiveTabDataUpdated();
      });
      const unsubscribeRemotesReadingStateChanged = effect(() => {
        // eslint-disable-next-line
        const sharedSessionsState = context.tabs.tabs.value.map((tab) => {
          return {
            bookId: tab.sharedSession?.readingState.bookId.value,
            chaperNumber: tab.sharedSession?.readingState.chapterNumber.value,
          };
        });

        userPresenceController?.handleOnlineUsersChanged();
      });
      const bookNames = signal<Map<string, string>>(new Map());
      effect(() => {
        const selectedTabId = context.tabs.selectedTabId.value;
        const selectedTab = context.tabs.tabs.value.find(
          (tab) => tab.id === selectedTabId
        );

        if (!selectedTabId || !selectedTab) {
          return;
        }

        const translationId =
          context.app.currentReadingState.value?.translationId;
        if (!translationId) {
          bookNames.value = new Map();
          return;
        }
        let isCancelled = false;
        context.bibleData
          .getTranslationBooks(translationId)
          .then((translationBooks) => {
            if (isCancelled) return;

            bookNames.value = new Map(
              translationBooks.books.map((book) => [book.id, book.name])
            );
          })
          .catch((error) => {
            console.error("Error fetching books:", error);
          });
        return () => {
          isCancelled = true;
        };
      });

      // 5. Disposers

      yield () => bibleVizUtilsEventManager.removeAllListeners();
      yield () => bibleVizUtilsObjectPooler.disposeAllPools();
      yield () => labelAnimationAdapter.disposeAll();
      yield () => unsubscribeLogin();
      yield () => unsubscribeOnlineUsersChanged();
      yield () => unsubscribeCurrentReadingStateChanged();
      yield () => unsubscribeRemotesReadingStateChanged();
      yield () => unsubscribeUserPresenceUpdate();
      yield () => {
        userColorController = undefined;
        sessionController = undefined;
        arrangementController = undefined;
        userPresenceController = undefined;
        labelInteractionController = undefined;
        // TODO: destroy extension bots
      };

      // 6. Expose API to dependent extensions

      function createPieceLabelService<T extends BiblePieceType>(
        labelPropertiesStrategies: PieceLabelServiceParams<T>["labelPropertiesStrategies"]
      ) {
        return new PieceLabelService({
          labelAdapterPort: labelAdapter,
          labelDataStorePort: labelDataStore,
          pieceActivityServicePort: pieceActivityService,
          labelPropertiesStrategies,
          labelDateFormatServicePort: labelDateService,
          idGeneratorPort: { getId: uuid },
          labelAnimationAdapterPort: labelAnimationAdapter,
          activityIndicatorsAdapterPort: activityIndicatorsAdapter,
        });
      }

      function createEventManager<
        // eslint-disable-next-line
        TEventMap extends Record<string, any>,
      >() {
        return new BaseEventManager<TEventMap>();
      }

      function createObjectPooler<
        P extends Record<keyof P, TypedBot<PieceBotTags>>,
      >({
        poolsData,
        dimensionGetter,
      }: {
        poolsData: ObjectPoolerConfig<P>;
        dimensionGetter: ObjectPoolerDimensionGetter;
      }) {
        return new ObjectPooler<P>(poolsData, dimensionGetter);
      }

      const api: BibleVizAPI = {
        ReadingHistoryTimeline,
        readingHistoryTimelineStyles: getReadingHistoryTimelineStyles(),
        bibleVizDataRepository,
        scriptureService,
        readingHistoryService,
        pieceActivityService,
        labelDateService,
        createPieceLabelService,
        createEventManager,
        createObjectPooler,
        bibleVizUtilsEventManager,
        userColorStore,
        userPresenceService,
        arrangementService,
        getDayRangeSeconds: GetDayRangeSeconds,
        GetPastDateInfo,
        CapitalizeFirstLetter,
        GetTextColorBasedOnBackground,
        IsValueBetween,
        ComputeRawGradientColors,
        ComputeLinearGradient,
        HexToRgb,
        RgbToHex,
        GetChildrenLevelColors,
        GetColorType,
        RGBStringToArray,
        HexLongToShort,
        HexShortToLong,
        ColorParser,
        sectionInfoMapper,
        pieceMapper,
        scriptureMap3DConfigProvider,
        readingHistoryConfigProvider,
        sessionProvider,
        bookNames,
        connectedUsers,
        useHorizontalScroll,
        stackConfigProvider,
      };

      return api;
    },
  });
};
