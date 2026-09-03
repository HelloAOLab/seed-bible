import {
  PortalComponent,
  type PortalComponentHandle,
} from "@packages/seed-bible/seed-bible/components";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import {
  composeThemeStyleText,
  registerExtension,
  type BibleToolContext,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { useSignal, useSignalEffect } from "@preact/signals";
import { v4 as uuid } from "uuid";
import pattern from "virtual:@pattern/house-of-the-lord";
import { getPiecesForExperience, toPieceLabel } from "./verseReference";
import { EXPERIENCE_KEYS } from "./experience";
import { EXPERIENCE_META } from "./experienceMeta";

const extensionId = "house-of-the-lord";

// `scrollToVerse` only scrolls; the flash is a separate decoration.
const VERSE_FLASH = {
  highlight: { colorId: "yellow" },
  removeAfterMs: 1000,
};

function versesInRange(verse: number, endVerse?: number): number[] {
  const last = endVerse && endVerse > verse ? endVerse : verse;
  return Array.from({ length: last - verse + 1 }, (_, index) => verse + index);
}

async function openScripture(
  context: SeedBibleState,
  bookId: string,
  chapter: number,
  verse?: number,
  endVerse?: number
) {
  const tab = context.app.selectedTab.value;
  const verses = verse === undefined ? null : versesInRange(verse, endVerse);

  if (!tab) {
    const newTab = context.tabs.addTab(undefined, {
      initialBookId: bookId,
      initialChapterNumber: chapter,
      scrollToVerse: verse,
    });
    context.app.selectTab(newTab.id);
    if (verses) {
      newTab.readingState.decorateVerses(bookId, chapter, verses, VERSE_FLASH);
    }
    return;
  }

  await tab.readingState.selectTranslationAndChapter(
    tab.readingState.translationId.peek(),
    bookId,
    chapter,
    { scrollToVerse: verse }
  );

  if (verses) {
    tab.readingState.decorateVerses(bookId, chapter, verses, VERSE_FLASH);
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

      let portalRef: PortalComponentHandle | null = null;

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
                const inst = uuid();
                if (portalRef) {
                  portalRef.sendMessage({ type: "highlight-piece", key });
                } else {
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
                          css: composeThemeStyleText(
                            context.theme.currentTheme.value
                          ),
                        });
                      });

                      useSignalEffect(() => {
                        if (!isReady.value) return;
                        const readingState =
                          context.app.selectedTab.value?.readingState;
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
                            highlightedPiece: key,
                          }}
                        />
                      );
                    },
                  });
                }
                ctx.readingState.clearSelectedVerses();
              },
            })),
        });
      }
    },
  });
};
