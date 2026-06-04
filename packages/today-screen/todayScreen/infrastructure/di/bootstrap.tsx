import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { MaterialIcon, SeedBibleIcon } from "seed-bible.components.icons";
import { getCustomStyles } from "todayScreen.infrastructure.presentation.styles.adapter";
import { Today } from "../presentation/components/Today";
import { addTranslations, useI18n } from "seed-bible.i18n.I18nManager";
import { TodayReadingHistoryService } from "todayScreen.application.services.TodayReadingHistoryService";
import { FakeSubscribedUsersProvider } from "todayScreen.infrastructure.adapters.fake.FakeSubscribedUsersProvider";
import {
  COMMUNITY_READING_SPAN_IDS,
  type CommunityReading,
  type CommunityReadingSpanId,
  type UserLastReading,
} from "todayScreen.domain.models.readingHistory";
import { translations } from "todayScreen.infrastructure.config.translations.index";
import type { BibleVizAPI } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/seedBible";
import { getReadingHistoryEvents } from "seed-bible.managers.ReadingHistoryManager";

const Icon = () => {
  return <MaterialIcon>home</MaterialIcon>;
};

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
      } = dependenciesMap[
        bibleVizUtilsId
      ] as DependenciesMap[typeof bibleVizUtilsId];

      const fakeSubscribedUsersProvider = new FakeSubscribedUsersProvider(
        sessionProvider
      );

      const todayReadingHistoryService = new TodayReadingHistoryService({
        readingEventsProviderPort: {
          getReadingHistoryEvents: (
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
          },
        },
        usersIdProviderPort: fakeSubscribedUsersProvider,
      });

      const userLastReading = signal<UserLastReading>(undefined);
      const communityReading = signal<CommunityReading<CommunityReadingSpanId>>(
        {
          [COMMUNITY_READING_SPAN_IDS.twoDays]: {},
          [COMMUNITY_READING_SPAN_IDS.week]: {},
          [COMMUNITY_READING_SPAN_IDS.month]: {},
        }
      );

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

      const cleanupCommunityReading = effect(() => {
        const now = Math.floor(Date.now() / 1000);
        const twoDaysAgo = now - 2 * 24 * 60 * 60;
        const aWeekAgo = now - 7 * 24 * 60 * 60;
        const aMonthAgo = now - 30 * 24 * 60 * 60;
        const spansData: Array<{
          id: CommunityReadingSpanId;
          span: { from: number; to: number };
        }> = [
          {
            id: COMMUNITY_READING_SPAN_IDS.twoDays,
            span: { from: twoDaysAgo, to: now },
          },
          {
            id: COMMUNITY_READING_SPAN_IDS.week,
            span: { from: aWeekAgo, to: now },
          },
          {
            id: COMMUNITY_READING_SPAN_IDS.month,
            span: { from: aMonthAgo, to: now },
          },
        ];

        void todayReadingHistoryService
          .getCommunityReading(spansData)
          .then((result) => {
            communityReading.value = result;
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

      yield context.tools.registerToolbarTool({
        id: "today",
        priority: 0,
        title: "Today",
        icon: Icon,
        onSelect: () => {
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
                  communityReading,
                  translate: (key, options) =>
                    t(key, {
                      ns: [extensionId, "seed-bible"],
                      ...(options ?? {}),
                    }),
                  bookNames,
                  addTab: (
                    bookId: string,
                    chapter: number,
                    translationId: string | undefined
                  ) => {
                    const tab = context.tabs.addTab(undefined, {
                      initialBookId: bookId,
                      initialChapterNumber: chapter,
                      initialTranslationId: translationId,
                    });
                    const paneId = context.panes.selectedPaneId.value;
                    if (paneId) {
                      context.panes.openInPane(paneId, { tabId: tab.id });
                    }
                    context.app.selectTab(tab.id);
                  },
                  getDefaultTranslation: () => {
                    const id =
                      configBot.tags.translationId ??
                      configBot.tags.translation;
                    return typeof id === "string" ? id : undefined;
                  },
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
        },
      });

      yield () => {
        cleanupUserLastReading();
        cleanupCommunityReading();
        cleanupTranslationBooks();
        destroy([]);
      };
    },
  });
};
