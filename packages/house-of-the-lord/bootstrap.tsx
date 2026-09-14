import "./discover.css";
import {
  PortalComponent,
  type PortalComponentHandle,
} from "@packages/seed-bible/seed-bible/components";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import {
  composeThemeStyleText,
  emphasizeVerses,
  registerExtension,
  type BibleToolContext,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { useSignal, useSignalEffect } from "@preact/signals";
import { v4 as uuid } from "uuid";
import pattern from "virtual:@pattern/house-of-the-lord";
import {
  getPiecesForChapter,
  getPiecesForExperience,
  toPieceLabel,
} from "./verseReference";
import {
  EXPERIENCE_KEYS,
  type AnyPieceKey,
  type ExperienceKey,
} from "./experience";
import { EXPERIENCE_META } from "./experienceMeta";
import { ExhibitCard } from "./ExhibitCard";
import type { BookId } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";

const extensionId = "house-of-the-lord";

async function openScripture(
  context: SeedBibleState,
  bookId: string,
  chapter: number,
  verse?: number,
  endVerse?: number
) {
  const tab = context.app.selectedTab.value;

  if (!tab) {
    const newTab = context.tabs.addTab(undefined, {
      initialBookId: bookId,
      initialChapterNumber: chapter,
      scrollToVerse: verse,
    });
    context.app.selectTab(newTab.id);
    if (verse !== undefined) {
      emphasizeVerses(newTab.readingState, {
        book: bookId as BookId,
        chapter,
        verse,
        endVerse,
      });
    }
    return;
  }

  await tab.readingState.selectTranslationAndChapter(
    tab.readingState.translationId.peek(),
    bookId,
    chapter,
    { scrollToVerse: verse }
  );

  if (verse !== undefined) {
    emphasizeVerses(tab.readingState, {
      book: bookId as BookId,
      chapter,
      verse,
      endVerse,
    });
  }
}

export const bootstrapExtension = () => {
  registerExtension({
    id: extensionId,
    init: function* (context: SeedBibleState) {
      const versesFor = (ctx: BibleToolContext) =>
        ctx.readingState.selectedVerses.value.map((v) => ({
          bookId: v.bookId,
          chapter: v.chapterNumber,
          verse: v.verse.number,
        }));

      const translate = (key: string, defaultValue: string) =>
        context.i18n.t(key, { ns: extensionId, defaultValue });

      let portalRef: PortalComponentHandle | null = null;

      const openExhibit = (experience: ExperienceKey, key?: AnyPieceKey) => {
        if (portalRef) {
          portalRef.sendMessage({
            type: "highlight-piece",
            experience,
            ...(key ? { key } : {}),
          });
          return;
        }

        const meta = EXPERIENCE_META[experience];
        // Generated once per pane rather than per render, so re-renders (e.g.
        // dragging the pane) reuse the same `inst` and the iframe keeps its
        // document instead of reloading.
        const inst = uuid();

        context.panes.openPane({
          placement: "floating",
          title: () => {
            const { t } = useI18n();
            return t(meta.title.key, {
              ns: meta.title.ns,
              defaultValue: meta.title.defaultValue,
            });
          },
          icon: meta.icon,
          onClose: () => {
            portalRef = null;
          },
          component: () => {
            const isReady = useSignal(false);
            // The pattern is cross-origin, so it cannot inherit the
            // reader's --sb-* variables; it gets the composed theme
            // text instead, and again whenever the theme changes.
            useSignalEffect(() => {
              if (!isReady.value) return;
              portalRef?.sendMessage({
                type: "theme-changed",
                css: composeThemeStyleText(context.theme.currentTheme.value),
              });
            });

            useSignalEffect(() => {
              if (!isReady.value) return;
              const readingState = context.app.selectedTab.value?.readingState;
              const bookId = readingState?.bookId.value;
              const chapterNumber = readingState?.chapterNumber.value;
              if (!bookId || !chapterNumber) return;
              portalRef?.sendMessage({
                type: "reading-changed",
                bookId,
                chapterNumber,
              });
            });

            return (
              <PortalComponent
                ref={(handle: PortalComponentHandle | null) => {
                  portalRef = handle;
                }}
                onMessage={(inbound: unknown) => {
                  const message = inbound as {
                    id: string;
                    data: {
                      bookId: string;
                      chapter?: number;
                      verse?: number;
                      endVerse?: number;
                    };
                  };

                  switch (message.id) {
                    case "reader-navigation":
                      {
                        openScripture(
                          context,
                          message.data.bookId,
                          message.data.chapter ?? 1,
                          message.data.verse,
                          message.data.endVerse
                        );
                      }
                      break;
                    case "ready":
                      {
                        isReady.value = true;
                      }
                      break;
                  }
                }}
                portal={experience}
                portalType="grid"
                inst={inst}
                pattern={pattern}
                query={{
                  dimension: experience,
                  experience,
                  ...(key ? { highlightedPiece: key } : {}),
                }}
              />
            );
          },
        });
      };

      // `reference` has to name the chapter being read: results whose reference
      // doesn't match it are dropped before display (BibleReadingManager's
      // `hasMatchingReference`).
      context.discover.registerDiscoverProvider({
        id: `${extensionId}-exhibits`,
        title: translate("title", "House of the Lord"),
        description: translate(
          "description",
          "Interactive 3D experiences of things the Bible describes, tied to the verses that mention them."
        ),
        discover: ({ book, chapter }) =>
          Object.values(EXPERIENCE_KEYS).flatMap((experience) => {
            const keys = getPiecesForChapter(experience, book, chapter);
            if (keys.length === 0) return [];

            const meta = EXPERIENCE_META[experience];
            const experienceName = translate(
              meta.title.key,
              meta.title.defaultValue
            );

            return [
              {
                type: "content" as const,
                title: experienceName,
                description: translate(
                  meta.description.key,
                  meta.description.defaultValue
                ),
                reference: { book, chapter },
                content: (
                  <ExhibitCard
                    experience={experience}
                    experienceName={experienceName}
                    pieces={keys.map((key) => ({
                      key,
                      label: translate(`piece-${key}`, toPieceLabel(key)),
                    }))}
                    onOpen={(key) => openExhibit(experience, key)}
                  />
                ),
              },
            ];
          }),
      });

      for (const experience of Object.values(EXPERIENCE_KEYS)) {
        const meta = EXPERIENCE_META[experience];

        yield context.tools.registerVerseToolbarTool({
          id: `${extensionId}-verse-${experience}`,
          priority: 300,
          title: meta.title,
          icon: meta.icon,
          isVisible: (ctx) =>
            getPiecesForExperience(experience, versesFor(ctx)).length > 0,
          getItems: (ctx) =>
            getPiecesForExperience(experience, versesFor(ctx)).map((key) => ({
              id: `${extensionId}-piece-${experience}-${key}`,
              title: {
                key: `piece-${key}`,
                ns: extensionId,
                defaultValue: toPieceLabel(key),
              },
              icon: meta.icon,
              onSelect: () => {
                openExhibit(experience, key);
                ctx.readingState.clearSelectedVerses();
              },
            })),
        });
      }
    },
  });
};
