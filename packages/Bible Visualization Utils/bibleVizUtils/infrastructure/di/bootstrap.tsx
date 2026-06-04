import { ScriptureService } from "bibleVizUtils.application.services.ScriptureService";
import { BibleVizDataRepository } from "bibleVizUtils.infrastructure.data.BibleVizDataRepository";
import { ReadingHistoryService } from "bibleVizUtils.application.services.ReadingHistoryService";
import { SessionService } from "bibleVizUtils.application.services.SessionService";
import { ArrangementService } from "bibleVizUtils.application.services.ArrangementService";
import { PieceActivityService } from "bibleVizUtils.application.services.PieceActivityService";
import { PieceDataRegistry } from "bibleVizUtils.application.services.PieceDataRegistry";
import { UserPresenceService } from "bibleVizUtils.application.services.UserPresenceService";
import { BaseEventManager } from "bibleVizUtils.application.services.BaseEventManager";
import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import { LabelDateService } from "bibleVizUtils.application.services.LabelDateService";
import { UserColorSyncService } from "bibleVizUtils.application.services.UserColorSyncService";
import { PieceLabelService } from "bibleVizUtils.application.services.PieceLabelService";
import { LabelInteractionService } from "bibleVizUtils.application.services.LabelInteractionService";

import { SeedBiblePresenceProvider } from "bibleVizUtils.infrastructure.adapters.userPresence.SeedBiblePresenceProvider";
import { ActivityIndicatorsAdapter } from "bibleVizUtils.infrastructure.adapters.pieceActivity.ActivityIndicatorsAdapter";
import { ActivityNotificationAdapter } from "bibleVizUtils.infrastructure.adapters.pieceActivity.ActivityNotificationAdapter";
import { LabelDataStore } from "bibleVizUtils.infrastructure.adapters.labels.LabelDataStore";
import { UserColorStore } from "bibleVizUtils.infrastructure.adapters.userPresence.UserColorStore";
import { SessionProvider } from "bibleVizUtils.infrastructure.adapters.session.SessionProvider";
import { UserDatabase } from "bibleVizUtils.infrastructure.adapters.user.UserDatabase";
import {
  ObjectPooler,
  type ObjectPoolerConfig,
  type DimensionGetter as ObjectPoolerDimensionGetter,
} from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";
import { LabelAdapter } from "bibleVizUtils.infrastructure.adapters.labels.LabelAdapter";

import { UserColorController } from "bibleVizUtils.infrastructure.controllers.session.UserColorController";
import { SessionController } from "bibleVizUtils.infrastructure.controllers.session.SessionController";
import { ArrangementController } from "bibleVizUtils.infrastructure.controllers.arrangement.ArrangementController";
import { UserPresenceController } from "bibleVizUtils.infrastructure.controllers.userPresence.UserPresenceController";
import { LabelInteractionController } from "bibleVizUtils.infrastructure.controllers.label.LabelInteractionController";
import type {
  BibleVizUtilsObjectPoolerMap,
  PieceBotTags,
  PoolData,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";

import { thisTypedBot as activityNotificationPrefab } from "bibleVizUtils.infrastructure.prefabs.activityNotification.botAdapter";
import { thisTypedBot as activityIndicatorPrefab } from "bibleVizUtils.infrastructure.prefabs.activityIndicator.botAdapter";
import { thisTypedBot as infoLabelTransformerPrefab } from "bibleVizUtils.infrastructure.prefabs.infoLabelTransformer.botAdapter";
import { thisTypedBot as infoLabelDatePrefab } from "bibleVizUtils.infrastructure.prefabs.infoLabelDate.botAdapter";
import { thisTypedBot as infoLabelTailPrefab } from "bibleVizUtils.infrastructure.prefabs.infoLabelTail.botAdapter";
import { thisTypedBot as infoLabelTextPrefab } from "bibleVizUtils.infrastructure.prefabs.infoLabelText.botAdapter";
import type { PieceLabelServiceParams } from "bibleVizUtils.domain.ports.label";
import {
  BiblePiece,
  type BiblePieceType,
} from "bibleVizUtils.domain.models.canvas";
import { CustomArrangementStore } from "bibleVizUtils.infrastructure.adapters.arrangement.CustomArrangementStore";
import { LabelFeedbackAdapter } from "bibleVizUtils.infrastructure.adapters.labels.LabelFeedbackAdapter";
import { ArrangementsConfigProvider } from "bibleVizUtils.infrastructure.config.arrangements.ArrangementsConfigProvider";
import { ArrangementAdapter } from "bibleVizUtils.infrastructure.adapters.arrangement.ArrangementAdapter";
import { LabelsConfigProvider } from "bibleVizUtils.infrastructure.config.labels.LabelsConfigProvider";
import { ActivityIndicatorBotsRepository } from "bibleVizUtils.infrastructure.adapters.pieceActivity.ActivityIndicatorBotsRepository";
import { ActivityIndicatorsConfigProvider } from "bibleVizUtils.infrastructure.config.activityIndicators.ActivityIndicatorsConfigProvider";
import { LabelFeedbackConfigProvider } from "bibleVizUtils.infrastructure.config.labels.LabelFeedbackConfigProvider";
import { ConsoleLoggerAdapter } from "bibleVizUtils.infrastructure.adapters.logger.ConsoleLoggerAdapter";
import { BookInfoMapper } from "bibleVizUtils.infrastructure.mappers.BookInfoMapper";
import { SectionInfoMapper } from "bibleVizUtils.infrastructure.mappers.SectionInfoMapper";
import { ActivityIndicatorMapper } from "bibleVizUtils.infrastructure.mappers.ActivityIndicatorMapper";
import { InfoLabelTextMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper";
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
} from "bibleVizUtils.domain.functions.colors";
import { IsValueBetween } from "bibleVizUtils.domain.functions.math";
import type { BibleVizAPI } from "bibleVizUtils.infrastructure.models.seedBible";
import {
  registerExtension /*, type SeedBibleState */,
  type SeedBibleState,
} from "seed-bible.app.api";
import {
  GetDayRangeSeconds,
  GetPastDateInfo,
} from "bibleVizUtils.domain.functions.time";
import { CapitalizeFirstLetter } from "bibleVizUtils.domain.functions.string";
import { ScriptureMap3DConfigProvider } from "bibleVizUtils.infrastructure.config.scriptureMap3D.ScriptureMap3DConfigProvider";
import { ReadingHistoryConfigProvider } from "bibleVizUtils.infrastructure.config.readingHistory.ReadingHistoryConfigProvider";
import { entrypoints } from "bibleVizUtils.infrastructure.entrypoints.casualos.botProvider";
import { connectedUserColors } from "seed-bible.managers.SessionsManager";
import { effect, signal } from "@preact/signals";
import { RadingInstanceProvider } from "bibleVizUtils.infrastructure.adapters.userPresence.ReadingInstanceProvider";
import { ReadingHistoryTimeline } from "bibleVizUtils.infrastructure.presentation.components.ui.ReadingHistoryTimeline";
import { getReadingHistoryTimelineStyles } from "bibleVizUtils.infrastructure.presentation.styles.adapter";

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

      const readingHistoryConfigProvider = new ReadingHistoryConfigProvider();
      const scriptureMap3DConfigProvider = new ScriptureMap3DConfigProvider();
      const infoLabelTextPool: PoolData<
        "InfoLabelText",
        BibleVizUtilsObjectPoolerMap["InfoLabelText"]
      > = {
        key: BiblePiece.InfoLabelText,
        prefab: infoLabelTextPrefab,
        customTags: [
          { tag: "isInfoLabelTextPrefab", value: false },
          { tag: "system", value: undefined },
        ],
        cleanupCustomTags: [
          { tag: "transformer", value: undefined },
          { tag: "ownerBotId", value: undefined },
          { tag: "onBotChanged", value: undefined },
        ],
        size: 8,
      };
      const infoLabelTailPool: PoolData<
        "InfoLabelTail",
        BibleVizUtilsObjectPoolerMap["InfoLabelTail"]
      > = {
        key: BiblePiece.InfoLabelTail,
        prefab: infoLabelTailPrefab,
        customTags: [
          { tag: "isInfoLabelTailPrefab", value: false },
          { tag: "system", value: undefined },
        ],
        cleanupCustomTags: [
          { tag: "transformer", value: undefined },
          { tag: "ownerBotId", value: undefined },
        ],
        size: 8,
      };
      const infoLabelDatePool: PoolData<
        "InfoLabelDate",
        BibleVizUtilsObjectPoolerMap["InfoLabelDate"]
      > = {
        key: BiblePiece.InfoLabelDate,
        prefab: infoLabelDatePrefab,
        customTags: [
          { tag: "isInfoLabelDatePrefab", value: true },
          { tag: "system", value: undefined },
        ],
        cleanupCustomTags: [
          { tag: "transformer", value: undefined },
          { tag: "ownerBotId", value: undefined },
        ],
        size: 8,
      };
      const infoLabelTransformerPool: PoolData<
        "InfoLabelTransformer",
        BibleVizUtilsObjectPoolerMap["InfoLabelTransformer"]
      > = {
        key: BiblePiece.InfoLabelTransformer,
        prefab: infoLabelTransformerPrefab,
        customTags: [
          { tag: "isInfoLabelTransformerPrefab", value: false },
          { tag: "system", value: undefined },
        ],
        cleanupCustomTags: [
          { tag: "ownerBotId", value: undefined },
          { tag: "ownerDataId", value: undefined },
          { tag: "pointableDefault", value: undefined },
        ],
        size: 8,
      };
      const activityIndicatorPool: PoolData<
        "ActivityIndicator",
        BibleVizUtilsObjectPoolerMap["ActivityIndicator"]
      > = {
        key: BiblePiece.ActivityIndicator,
        prefab: activityIndicatorPrefab,
        customTags: [
          { tag: "isActivityIndicatorPrefab", value: false },
          { tag: "isActivityIndicator", value: true },
          { tag: "system", value: undefined },
        ],
        cleanupCustomTags: [
          { tag: "transformer", value: undefined },
          { tag: "ownerBotId", value: undefined },
          { tag: "ownerDataId", value: undefined },
          { tag: "initialPosition", value: undefined },
          { tag: "label", value: undefined },
          { tag: "labelOpacity", value: 1 },
          { tag: "formOpacity", value: 1 },
          { tag: "formRenderOrder", value: undefined },
          { tag: "index", value: undefined },
          { tag: "targetOpacity", value: 1 },
        ],
        size: 8,
      };
      const activityNotificationPool: PoolData<
        "ActivityNotification",
        BibleVizUtilsObjectPoolerMap["ActivityNotification"]
      > = {
        key: BiblePiece.ActivityNotification,
        prefab: activityNotificationPrefab,
        customTags: [
          { tag: "isActivityNotificationPrefab", value: false },
          { tag: "system", value: undefined },
        ],
        cleanupCustomTags: [
          { tag: "ownerBotId", value: undefined },
          { tag: "formOpacity", value: 1 },
          { tag: "direction", value: undefined },
          { tag: "offset", value: undefined },
          { tag: "scaleX", value: 0.3 },
          { tag: "scaleY", value: 0.3 },
        ],
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
      const infoLabelTextMapper = new InfoLabelTextMapper();
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
        scriptureMap3DConfigProvider,
        readingHistoryConfigProvider,
        sessionProvider,
        bookNames,
        connectedUsers,
      };

      return api;
    },
  });
};
