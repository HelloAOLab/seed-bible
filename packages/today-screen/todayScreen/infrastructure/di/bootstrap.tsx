import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import { getCustomStyles } from "todayScreen.infrastructure.presentation.styles.adapter";
import { Today } from "../presentation/components/Today";
import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
import { TodayReadingHistoryService } from "todayScreen.application.services.TodayReadingHistoryService";
import { FakeSubscribedUsersProvider } from "todayScreen.infrastructure.adapters.fake.FakeSubscribedUsersProvider";
import type {
  FilteredReading,
  UserLastReading,
} from "todayScreen.domain.models.readingHistory";
import { translations } from "todayScreen.infrastructure.config.translations.index";
import type { BibleVizAPI } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/seedBible";
import { getReadingHistoryEvents } from "seed-bible.managers.ReadingHistoryManager";
import {
  DEFAULT_TRANSLATION_ID,
  DEFAULT_TRANSLATION_LANGUAGE,
} from "seed-bible.managers.BibleReadingManager";
import type { VerseSearchResult } from "todayScreen.domain.models.search";
import { ReadingHistoryConfigProvider } from "../config/readingHistory/readingHistoryConfigProvider";
import { getHighlightedWelcomeVerse } from "../config/translations/welcomeVerseMap";

// const Icon = () => {
//   return <MaterialIcon>home</MaterialIcon>;
// };

const customCSS = getCustomStyles();

const bibleVizUtilsId = "bible-visualization-utils";

interface DependenciesMap {
  [bibleVizUtilsId]: BibleVizAPI;
}

const extensionId = "today-screen";

const dependencies: (keyof DependenciesMap)[] = [bibleVizUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    dependencies,
    id: extensionId,
    init: function* (context: SeedBibleState, dependenciesMap) {
      addTranslations(extensionId, translations);
      const {
        bookNames,
        sessionProvider,
        ReadingHistoryTimeline,
        getDayRangeSeconds,
        GetPastDateInfo,
        CapitalizeFirstLetter,
        readingHistoryService,
      } = dependenciesMap[
        bibleVizUtilsId
      ] as DependenciesMap[typeof bibleVizUtilsId];

      const fakeSubscribedUsersProvider = new FakeSubscribedUsersProvider(
        sessionProvider
      );

      const fakeGetReadingHistoryEvents = (
        recordName: string,
        startTime: number,
        endTime: number
      ) => {
        if (
          context.login.userId.value &&
          recordName === context.login.userId.value
        ) {
          return getReadingHistoryEvents(recordName, startTime, endTime);
        }
        return fakeSubscribedUsersProvider.getReadingHistoryEvents(
          recordName,
          startTime,
          endTime
        );
      };

      const todayReadingHistoryService = new TodayReadingHistoryService({
        readingEventsProviderPort: {
          getReadingHistoryEvents: fakeGetReadingHistoryEvents,
        },
        usersIdProviderPort: fakeSubscribedUsersProvider,
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
        const activeTranslationId =
          readingState?.translationId ?? DEFAULT_TRANSLATION_ID;
        const activeLanguage =
          readingState?.tab.readingState.translation.value?.language ??
          DEFAULT_TRANSLATION_LANGUAGE;

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

      /**
       * Opens the Today screen in the currently selected pane. Extracted so it
       * can be reused both by the toolbar tool and exposed as the extension's
       * public API (`getExtensionExports("today-screen").open`).
       */
      const openToday = () => {
        const component = () => {
          const { t, language } = useI18n();
          return (
            <Today
              config={{
                MaterialIcon,
                SeedBibleIcon,
                language,
                username: context.login.profile.value?.name,
                userId: context.login.userId.value ?? undefined,
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
                  const paneId = context.panes.selectedPaneId.value;
                  if (paneId) {
                    context.panes.openInPane(paneId, { tabId: tab.id });
                  }
                  context.app.selectTab(tab.id);
                },
                getDefaultTranslation: () => {
                  const id =
                    configBot.tags.translationId ?? configBot.tags.translation;
                  return typeof id === "string" ? id : undefined;
                },
                searchVerses,
                getVerseText,
                lastTranslationId,
                openBookSelector: () => {
                  const pane =
                    context.panes.panes.value.find(
                      (p) => p.id === context.panes.selectedPaneId.value
                    ) ?? null;
                  if (pane) {
                    context.selector.setOpen(true, pane);
                  }
                },
                translationBooks: lastTranslationBooks,
                translationBooksMap,
                subscribedUsersProfileProvider: fakeSubscribedUsersProvider,
                subscribedUsersIdsProvider: fakeSubscribedUsersProvider,
                ReadingHistoryTimeline,
                getDayRangeSeconds,
                getReadingHistoryEvents: fakeGetReadingHistoryEvents,
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
                getTranslationBooks: (translation: string) => {
                  return context.bibleData.translationBooks.value.get(
                    translation
                  );
                },
                readingHistoryConfigProvider,
                getHighlightedWelcomeVerse,
              }}
              customCSS={customCSS}
            />
          );
        };

        const paneId = context.panes.selectedPaneId.value;
        if (paneId) {
          context.tabs.selectTab("");
          context.panes.openInPane(paneId, { component });
        }
      };

      // yield context.tools.registerToolbarTool({
      //   id: "today",
      //   priority: 0,
      //   title: "Today",
      //   icon: Icon,
      //   onSelect: openToday,
      // });

      yield () => {
        cleanupUserLastReading();
        cleanupTranslationBooks();
        cleanupTranslationId();
        destroy([]);
      };

      // Public API: lets the host app (or other extensions) open the Today
      // screen without a toolbar button, via getExtensionExports("today-screen").
      return { open: openToday };
    },
  });
};
