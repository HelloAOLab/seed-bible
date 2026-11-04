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
import type { SeedBibleState } from "seed-bible";
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

/** A handle on the shared utils; call `release` once done with them. */
export interface SeedBibleUtilsLease {
  api: UtilsAPI;
  release: () => void;
}

interface SharedUtils {
  api: UtilsAPI;
  users: number;
  dispose: () => void;
}

const sharedUtilsByContext = new WeakMap<SeedBibleState, SharedUtils>();

/**
 * The utils for `context`, built by whichever extension asks first and torn
 * down once every extension that asked has released them. Bible Stack and
 * Scripture Map both use them, so they share one set of services (and one
 * user color sync) instead of each running its own.
 */
export function acquireSeedBibleUtils(
  context: SeedBibleState
): SeedBibleUtilsLease {
  let shared = sharedUtilsByContext.get(context);
  if (!shared) {
    shared = { ...createSeedBibleUtils(context), users: 0 };
    sharedUtilsByContext.set(context, shared);
  }
  const lease = shared;
  lease.users++;

  let released = false;
  return {
    api: lease.api,
    release: () => {
      if (released) {
        return;
      }
      released = true;
      lease.users--;
      if (lease.users === 0) {
        sharedUtilsByContext.delete(context);
        lease.dispose();
      }
    },
  };
}

function createSeedBibleUtils(context: SeedBibleState): {
  api: UtilsAPI;
  dispose: () => void;
} {
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
  const userDatabase = new UserDatabase(context.friends);
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

  const userColorController = new UserColorController(userColorSyncService);
  const sessionController = new SessionController({ sessionService });
  const userPresenceController = new UserPresenceController(
    userPresenceService
  );

  // 4. Event wiring

  sessionService.tryEmitUserLoggedInEvent();
  const unsubscribeLogin = context.login.userId.subscribe(() => {
    userColorController.handleUserLogin();
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
    userColorController.handleOnlineUsersChanged();
    sessionController.handleOnlineUsersChanged();
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
    userPresenceController.handleActiveTabDataUpdated();
  });
  const unsubscribeRemotesReadingStateChanged = effect(() => {
    // eslint-disable-next-line
    const sharedSessionsState = context.tabs.tabs.value.map((tab) => {
      return {
        // Each peer's own position — the session position below only
        // covers peers who have yet to broadcast one.
        participantPositions: tab.sharedSession?.participantPositions.value,
        bookId: tab.sharedSession?.readingState.bookId.value,
        chapterNumber: tab.sharedSession?.readingState.chapterNumber.value,
      };
    });

    userPresenceController.handleOnlineUsersChanged();
  });
  const bookNames = signal<Map<string, string>>(new Map());
  const unsubscribeBookNames = effect(() => {
    const selectedTabId = context.tabs.selectedTabId.value;
    const selectedTab = context.tabs.tabs.value.find(
      (tab) => tab.id === selectedTabId
    );

    if (!selectedTabId || !selectedTab) {
      return;
    }

    const translationId = context.app.currentReadingState.value?.translationId;
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

  const dispose = () => {
    seedBibleUtilsEventManager.removeAllListeners();
    unsubscribeLogin();
    unsubscribeOnlineUsersChanged();
    unsubscribeCurrentReadingStateChanged();
    unsubscribeRemotesReadingStateChanged();
    unsubscribeBookNames();
  };

  // 6. Expose API to the extensions that use it

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
    arrangementConfigProvider: arrangementsConfigProvider,
    customArrangementStore: customArrangementStore,
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
  };

  return { api, dispose };
}
