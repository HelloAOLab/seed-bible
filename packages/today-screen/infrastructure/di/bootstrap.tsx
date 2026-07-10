import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { MaterialIcon } from "@packages/seed-bible/seed-bible/components";
import { Today } from "../presentation/components/Today";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import { TodayReadingHistoryService } from "@packages/today-screen/application/services/TodayReadingHistoryService";
import { SubscribedUsersProvider } from "../adapters/subscriptions/SubscribedUsersProvider";
import type {
  FilteredReading,
  UserLastReading,
} from "@packages/today-screen/domain/models/readingHistory";
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

      const userLastReading = signal<UserLastReading>(undefined);

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

      const cleanupUserLastReading = effect(() => {
        const userId = context.login.userId.value;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        context.app.currentReadingState.value;

        if (!userId) {
          userLastReading.value = undefined;
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const oneYearAgo = now - 365 * 24 * 60 * 60;

        void todayReadingHistoryService
          .getUserLastReading(userId, { from: oneYearAgo, to: now })
          .then((result) => {
            userLastReading.value = result;
          })
          .catch((err) => {
            console.error(
              "[Debug] [today-screen] getUserLastReading failed for userId",
              userId,
              err
            );
          });
      });

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
                MaterialIcon,
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
                userLastReading,
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
                      className: "sb-verse-decoration-search-result",
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
          title: "Today",
          component,
        });
      };

      const isTodayOpen = signal(
        context.navigation.currentUrl.value.searchParams.get("today") === "open"
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
        cleanupUserLastReading();
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
