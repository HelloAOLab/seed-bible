import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { MaterialIcon } from "@packages/seed-bible/seed-bible/components";
import {
  Skeleton,
  SkeletonContainer,
} from "@packages/seed-bible/seed-bible/components/Skeleton/Skeleton";
import { Today } from "../presentation/components/Today";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import { TodayReadingHistoryService } from "@packages/today-screen/application/services/TodayReadingHistoryService";
import { SubscribedUsersProvider } from "../adapters/subscriptions/SubscribedUsersProvider";
import type { FilteredReading } from "@packages/today-screen/domain/models/readingHistory";
import { createReadingHistoryState } from "./createReadingHistoryState";
import type { UtilsAPI } from "@packages/seed-bible-utils/infrastructure/models/seedBible";
import { getReadingHistoryEvents } from "@packages/seed-bible/seed-bible/managers";
import { getDefaultTranslationForLanguage } from "@packages/seed-bible/seed-bible/managers";
import type { VerseSearchResult } from "@packages/today-screen/domain/models/search";
import { ReadingHistoryConfigProvider } from "../config/readingHistory/readingHistoryConfigProvider";
import { getHighlightedWelcomeVerse } from "../config/translations/welcomeVerseMap";

export interface TodayScreenAPI {
  open: () => void;
}
// const Icon = () => {
//   return <MaterialIcon>home</MaterialIcon>;
// };

const seedBibleUtilsId = "seed-bible-utils";

interface DependenciesMap {
  [seedBibleUtilsId]: UtilsAPI;
}

const extensionId = "today-screen";

const dependencies: (keyof DependenciesMap)[] = [seedBibleUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    dependencies,
    id: extensionId,
    init: function* (context: SeedBibleState, dependenciesMap) {
      const {
        bookNames,
        sessionProvider,
        ReadingHistoryTimeline,
        getDayRangeSeconds,
        GetPastDateInfo,
        CapitalizeFirstLetter,
        readingHistoryService,
        useHorizontalScroll,
        ColorParser,
      } = dependenciesMap[
        seedBibleUtilsId
      ] as DependenciesMap[typeof seedBibleUtilsId];

      const subscribedUsersProvider = new SubscribedUsersProvider();
      // sessionProvider

      const localGetReadingHistoryEvents = (
        recordName: string,
        startTime: number,
        endTime: number
      ) => {
        return getReadingHistoryEvents(
          context.os,
          recordName,
          startTime,
          endTime
        );
      };

      const todayReadingHistoryService = new TodayReadingHistoryService({
        readingEventsProviderPort: {
          getReadingHistoryEvents: localGetReadingHistoryEvents,
        },
        usersIdProviderPort: {
          getUsersIds: () => {
            if (context.login.userId.value) {
              return [
                context.login.userId.value,
                ...subscribedUsersProvider.getUsersIds(),
              ];
            }
            return [];
          },
        },
      });

      // Three-state reading-history gate (loading | empty | ready). Derived
      // from `userId` (known synchronously at startup) so a returning user
      // never flashes the Welcome page while their history loads.
      const { readingHistory, dispose: disposeReadingHistory } =
        createReadingHistoryState({
          userId: context.login.userId,
          refetchTrigger: context.app.currentReadingState,
          getUserLastReading: (userId, range) =>
            todayReadingHistoryService.getUserLastReading(userId, range),
        });

      /**
       * Fetches the community reading for one exact period. The presentation
       * layer drives this reactively from the selected `timespan`.
       */
      const getCommunityReading = (timespan: {
        from: number;
        to: number;
      }): Promise<FilteredReading> =>
        todayReadingHistoryService
          .getCommunityReading([{ id: "value", span: timespan }])
          .then((result) => result.value);

      /**
       * Full-text verse search over the active translation/language (falling
       * back to the defaults when there is no current reading state). Mirrors
       * the search performed by the reader's FloatingSearchPanel.
       */
      const searchVerses = async (
        query: string
      ): Promise<VerseSearchResult[]> => {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const readingState = context.app.currentReadingState.value;
        const defaultTranslation = getDefaultTranslationForLanguage(
          context.i18n.defaultLanguage
        );
        const activeTranslationId =
          readingState?.translationId ?? defaultTranslation.id;
        const activeLanguage =
          readingState?.tab.readingState.translation.value?.language ??
          defaultTranslation.language;

        const response = await context.search.searchVerses(
          activeLanguage,
          activeTranslationId,
          trimmed
        );

        return (response.hits ?? []).map((hit) => ({
          id: hit.document.id,
          translationId: hit.document.translation,
          bookId: hit.document.book,
          chapterNumber: hit.document.chapter,
          verseNumber: hit.document.verse,
          reference: hit.document.reference,
          text: hit.document.text,
        }));
      };

      /**
       * Plain text of a single verse. Downloads the chapter via the Bible data
       * manager and concatenates the verse's textual segments (ignoring inline
       * headings, line breaks and footnote references).
       */
      const getVerseText = async (
        translationId: string,
        bookId: string,
        chapter: number,
        verse: number
      ): Promise<string | undefined> => {
        const chapterData = await context.bibleData.getTranslationBookChapter(
          translationId,
          bookId,
          chapter
        );

        const verseContent = chapterData.chapter.content.find(
          (item) => item.type === "verse" && item.number === verse
        );
        if (!verseContent || verseContent.type !== "verse") return undefined;

        return verseContent.content
          .map((part) =>
            typeof part === "string" ? part : "text" in part ? part.text : ""
          )
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      };

      const lastTranslationBooks = signal<{
        books: Array<{
          id: string;
          name: string;
          commonName?: string;
          numberOfChapters: number;
        }>;
      } | null>(null);
      const cleanupTranslationBooks = effect(() => {
        const books =
          context.app.currentReadingState.value?.tab.readingState
            .translationBooks.value ?? null;
        if (books !== null) {
          lastTranslationBooks.value = books;
        }
      });

      const translationBooksMap = computed(() => {
        const books = lastTranslationBooks.value?.books ?? [];
        return new Map(books.map((book) => [book.id, book]));
      });

      const lastTranslationId = signal<string | undefined>(undefined);
      const cleanupTranslationId = effect(() => {
        const translationId =
          context.app.currentReadingState.value?.tab.readingState.translationId
            .value ?? null;
        if (translationId !== null) {
          lastTranslationId.value = translationId;
        }
      });

      const sharedSessions = computed(() => {
        const tabs = context.tabs.tabs.value.filter((tab) => tab.sharedSession);
        return tabs.map((tab) => tab.sharedSession!);
      });

      const readingHistoryConfigProvider = new ReadingHistoryConfigProvider();

      const TODAY_PANE_ID = "today-screen-pane";

      /**
       * Renders the Today screen as a fullscreen pane. This is the "apply the
       * open state to the UI" half of the flow: opening is driven through the
       * `?today=open` URL param (see `isTodayOpen` below), and the reconciling
       * effect calls this when the state turns on.
       */
      const renderTodayPane = () => {
        const component = () => {
          const { t, language } = useI18n();
          return (
            <Today
              config={{
                isMobile: context.app.isMobile,
                ColorParser,
                MaterialIcon,
                Skeleton,
                SkeletonContainer,
                language,
                username: context.login.profile.value?.name,
                userId: context.login.userId.value ?? undefined,
                userProfile: context.login.userId.value
                  ? {
                      name: context.login.profile.value?.name ?? "Guest",
                      pictureUrl: context.login.profile.value?.pictureUrl,
                      color: sessionProvider.getUserColorById(
                        context.login.userId.value
                      ),
                      icon: sessionProvider.getUserIconById(
                        context.login.userId.value
                      ),
                    }
                  : undefined,
                readingHistory,
                getCommunityReading,
                translate: (key, options) =>
                  t(key, {
                    ns: [extensionId, "seed-bible"],
                    ...(options ?? {}),
                  }),
                bookNames,
                addTab: (
                  bookId: string,
                  chapter: number,
                  translationId: string | undefined,
                  verse: number | undefined
                ) => {
                  const tab = context.tabs.addTab(undefined, {
                    initialBookId: bookId,
                    initialChapterNumber: chapter,
                    initialTranslationId: translationId,
                    scrollToVerse: verse,
                  });
                  // `scrollToVerse` only scrolls; the highlight is a separate
                  // decoration (same pattern as the reader's search panel).
                  if (verse !== undefined) {
                    tab.readingState.decorateVerses(bookId, chapter, verse, {
                      className: "sb-verse-decoration-diminish",
                      containerClassName: "sb-chapter-decoration-diminish",
                      removeAfterMs: 3000,
                    });
                  }
                  const slotId = context.tabsLayout.selectedSlotId.value;
                  if (slotId) {
                    context.tabsLayout.openTabInSlot(slotId, tab.id);
                  }
                  context.app.selectTab(tab.id);
                },
                closeToday: () => {
                  isTodayOpen.value = false;
                },
                getDefaultTranslation: () => {
                  const readingState = context.app.currentReadingState.value;
                  return (
                    readingState?.tab.readingState.defaultTranslation.id ??
                    getDefaultTranslationForLanguage(
                      context.i18n.defaultLanguage
                    ).id
                  );
                },
                searchVerses,
                getVerseText,
                lastTranslationId,
                openBookSelector: () => {
                  const slot =
                    context.tabsLayout.slots.value.find(
                      (s) => s.id === context.tabsLayout.selectedSlotId.value
                    ) ?? null;
                  if (slot) {
                    context.selector.setOpen(true, slot);
                  }
                },
                translationBooks: lastTranslationBooks,
                translationBooksMap,
                subscribedUsersProfileProvider: subscribedUsersProvider,
                subscribedUsersIdsProvider: subscribedUsersProvider,
                ReadingHistoryTimeline,
                getDayRangeSeconds,
                getReadingHistoryEvents: localGetReadingHistoryEvents,
                GetPastDateInfo,
                CapitalizeFirstLetter,
                theme: context.theme.currentTheme.value,
                readingHistoryService,
                sharedSessions,
                userDeterministicIdentityProvider: {
                  getColorById: (id: string) =>
                    sessionProvider.getUserColorById(id),
                  getIconById: (id: string) =>
                    sessionProvider.getUserIconById(id),
                },
                joinSharedSession: (id: string) =>
                  context.app.joinSharedSession(id),
                bookmarks: context.bookmarks.bookmarks,
                getTranslationBooks: (translation: string) =>
                  context.bibleData.getTranslationBooks(translation),
                readingHistoryConfigProvider,
                getHighlightedWelcomeVerse,
                useHorizontalScroll,
              }}
            />
          );
        };

        // Custom components can no longer take over a tab slot — Today opens
        // as a fullscreen pane instead.
        context.panes.openPane({
          id: TODAY_PANE_ID,
          placement: "fullscreen",
          title: () => {
            const { t } = useI18n();
            return t("today", {
              ns: "today-screen",
              defaultValue: "Today",
            });
          },
          component,
        });
      };

      // Today opens automatically on a cold load (no explicit `?today=`
      // param) as long as the URL isn't already pointing somewhere specific —
      // a book/chapter/verse deep link, or a shared-session invite
      // (`?sessionId=`). An explicit `?today=` param always wins either way,
      // matching the deep-linkable modals in SeedBibleStateManager.
      //
      // This must read `initialUrl` (the URL as first loaded), not the live
      // `currentUrl`: TabsManager echoes the reader's current book/chapter
      // back into the URL as soon as it initializes (so links are always
      // shareable), which happens well before extensions finish loading. By
      // the time this code runs, a cold load with no book/chapter param would
      // already show `?book=GEN&chapter=1` in the live URL — indistinguishable
      // from a real deep link unless we look at the URL from before that echo.
      const initialUrlParams = context.navigation.initialUrl.searchParams;
      const hasCompetingDeepLink =
        initialUrlParams.has("book") ||
        initialUrlParams.has("chapter") ||
        initialUrlParams.has("verse") ||
        initialUrlParams.has("sessionId");
      const requestedToday = initialUrlParams.get("today");
      const isTodayOpen = signal(
        requestedToday !== null
          ? requestedToday === "open"
          : !hasCompetingDeepLink
      );

      const cleanupTodayUrlSync = context.navigation.syncSignalsToUrl({
        today: {
          get value() {
            return isTodayOpen.value ? "open" : null;
          },
          set value(newValue) {
            isTodayOpen.value = newValue === "open";
          },
        },
      });

      const cleanupRenderTodayPane = effect(() => {
        const shouldBeOpen = isTodayOpen.value;
        const paneIsOpen = context.panes.panes
          .peek()
          .some((pane) => pane.id === TODAY_PANE_ID);
        if (shouldBeOpen && !paneIsOpen) {
          renderTodayPane();
        } else if (!shouldBeOpen && paneIsOpen) {
          context.panes.closePane(TODAY_PANE_ID);
        }
      });

      const cleanupTodayPaneClosed = effect(() => {
        const paneIsOpen = context.panes.panes.value.some(
          (pane) => pane.id === TODAY_PANE_ID
        );
        if (!paneIsOpen && isTodayOpen.peek()) {
          isTodayOpen.value = false;
        }
      });

      const openToday = () => {
        isTodayOpen.value = true;
      };

      yield () => {
        disposeReadingHistory();
        cleanupTranslationBooks();
        cleanupTranslationId();
        cleanupTodayUrlSync();
        cleanupRenderTodayPane();
        cleanupTodayPaneClosed();
      };

      // Public API: lets the host app (or other extensions) open the Today
      // screen without a toolbar button, via getExtensionExports("today-screen").
      return { open: openToday };
    },
  });
};
