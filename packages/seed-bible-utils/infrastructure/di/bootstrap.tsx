import { ScriptureService } from "../../application/services/ScriptureService";
import { DataRepository } from "../data/DataRepository";
import { ReadingHistoryService } from "../../application/services/ReadingHistoryService";
import { SessionService } from "../../application/services/SessionService";
import { ArrangementService } from "../../application/services/ArrangementService";
import { UserPresenceService } from "../../application/services/UserPresenceService";
import { BaseEventManager } from "../../application/services/BaseEventManager";
import type { SeedBibleUtilsEvents } from "../../domain/models/events";
import { UserColorSyncService } from "../../application/services/UserColorSyncService";

import { SeedBiblePresenceProvider } from "../adapters/userPresence/SeedBiblePresenceProvider";
import { UserColorStore } from "../adapters/userPresence/UserColorStore";
import { SessionProvider } from "../adapters/session/SessionProvider";
import { UserDatabase } from "../adapters/user/UserDatabase";

import { UserColorController } from "../controllers/session/UserColorController";
import { SessionController } from "../controllers/session/SessionController";
import { ArrangementController } from "../controllers/arrangement/ArrangementController";
import { UserPresenceController } from "../controllers/userPresence/UserPresenceController";

import { CustomArrangementStore } from "../adapters/arrangement/CustomArrangementStore";
import { ArrangementsConfigProvider } from "../config/arrangements/ArrangementsConfigProvider";
import { ArrangementAdapter } from "../adapters/arrangement/ArrangementAdapter";
// import { ConsoleLoggerAdapter } from "../adapters/logger/ConsoleLoggerAdapter";
import { BookInfoMapper } from "../mappers/BookInfoMapper";
import { SectionInfoMapper } from "../mappers/SectionInfoMapper";
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
import type { UtilsAPI } from "../models/seedBible";
import { registerExtension, type SeedBibleState } from "seed-bible";
import {
  GetDayRangeSeconds,
  GetPastDateInfo,
} from "../../domain/functions/time";
import { CapitalizeFirstLetter } from "../../domain/functions/string";
import { ReadingHistoryConfigProvider } from "../config/readingHistory/ReadingHistoryConfigProvider";
import { getUserAnimalVisual } from "../../../seed-bible/seed-bible/managers/SessionsManager";
import { effect, signal } from "@preact/signals";
// import { RadingInstanceProvider } from "../adapters/userPresence/ReadingInstanceProvider";
import { ReadingHistoryTimeline } from "../presentation/components/ui/ReadingHistoryTimeline";
import { useHorizontalScroll } from "../presentation/hooks/useHorizontalScroll";

export let userColorController: UserColorController | undefined = undefined;
export let sessionController: SessionController | undefined = undefined;
export let arrangementController: ArrangementController | undefined = undefined;
export let userPresenceController: UserPresenceController | undefined =
  undefined;

export const bootstrapExtension = () => {
  registerExtension({
    id: "seed-bible-utils",
    init: function* (context: SeedBibleState) {
      // 1. Instantiating adapters
      const readingHistoryConfigProvider = new ReadingHistoryConfigProvider();
      const seedBibleUtilsEventManager =
        new BaseEventManager<SeedBibleUtilsEvents>();
      const seedBiblePresenceProvider = new SeedBiblePresenceProvider({
        state: context,
      });
      const userColorStore = new UserColorStore(seedBibleUtilsEventManager);
      const sessionProvider = new SessionProvider({
        state: context,
        // Single source of truth for user color + icon, shared with the session
        // avatars. Injected here so the adapter stays decoupled from SessionsManager.
        getUserVisual: getUserAnimalVisual,
      });
      const userDatabase = new UserDatabase();
      const seedBibleUtilsDataRepository = new DataRepository();
      const arrangementAdapter = new ArrangementAdapter();
      const customArrangementStore = new CustomArrangementStore({
        arrangementAdapter: arrangementAdapter,
      });
      const arrangementsConfigProvider = new ArrangementsConfigProvider(
        arrangementAdapter
      );
      const bookInfoMapper = new BookInfoMapper({
        arrangementConfigProviderPort: arrangementsConfigProvider,
        customArrangementStorePort: customArrangementStore,
        booksStaticInfoRepository: seedBibleUtilsDataRepository,
      });
      const sectionInfoMapper = new SectionInfoMapper({
        bookInfoMapper,
        arrangementConfigProviderPort: arrangementsConfigProvider,
        customArrangementStorePort: customArrangementStore,
      });
      arrangementAdapter.setSectionInfoMapperPort(sectionInfoMapper);
      // const readingInstanceProvider = new RadingInstanceProvider({
      //   state: context,
      //   sessionProviderPort: sessionProvider,
      // });

      // 2. Instantiating services

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      tenDaysAgo.setHours(0, 0, 0, 0);
      const tenDaysAgoTimeSeconds = Math.floor(tenDaysAgo.getTime() / 1000);
      const readingHistoryService = new ReadingHistoryService(
        tenDaysAgoTimeSeconds
      );
      const sessionService = new SessionService({
        loginManager: context.login,
        sessionEventPort: seedBibleUtilsEventManager,
      });
      const arrangementService = new ArrangementService({
        arrangementConfigProviderPort: arrangementsConfigProvider,
        eventManager: seedBibleUtilsEventManager,
        customArrangementStorePort: customArrangementStore,
      });
      const scriptureService = new ScriptureService(
        seedBibleUtilsDataRepository,
        arrangementService
      );
      const userPresenceService = new UserPresenceService({
        userPresenceEventPort: seedBibleUtilsEventManager,
        userPresenceProviderPort: seedBiblePresenceProvider,
      });
      const userColorSyncService = new UserColorSyncService({
        sessionProviderPort: sessionProvider,
        userDatabasePort: userDatabase,
        userColorStorePort: userColorStore,
      });

      // 3. Instantiating controllers

      userColorController = new UserColorController(userColorSyncService);
      sessionController = new SessionController({ sessionService });
      arrangementController = new ArrangementController(arrangementService);
      userPresenceController = new UserPresenceController(userPresenceService);

      // 4. Event wiring

      sessionService.tryEmitUserLoggedInEvent();
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

      yield () => seedBibleUtilsEventManager.removeAllListeners();
      yield () => unsubscribeLogin();
      yield () => unsubscribeOnlineUsersChanged();
      yield () => unsubscribeCurrentReadingStateChanged();
      yield () => unsubscribeRemotesReadingStateChanged();
      yield () => {
        userColorController = undefined;
        sessionController = undefined;
        arrangementController = undefined;
        userPresenceController = undefined;
      };

      // 6. Expose API to dependent extensions

      function createEventManager<
        // eslint-disable-next-line
        TEventMap extends Record<string, any>,
      >() {
        return new BaseEventManager<TEventMap>();
      }

      const api: UtilsAPI = {
        ReadingHistoryTimeline,
        dataRepository: seedBibleUtilsDataRepository,
        scriptureService,
        readingHistoryService,
        createEventManager,
        seedBibleUtilsEventManager,
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
        readingHistoryConfigProvider,
        sessionProvider,
        bookNames,
        connectedUsers,
        useHorizontalScroll,
      };

      return api;
    },
  });
};
