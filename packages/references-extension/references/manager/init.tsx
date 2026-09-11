import type {
  Pane,
  SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { computed, effect, signal } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { GetReferences } from "./utils";
import type { ChapterReferences, VerseReferences } from "./interfaces";
import { openReferencePane } from "./referenceApp";
import { offerReferenceDownload } from "./askToDownload";

export default function initReferencesExtension() {
  registerExtension({
    id: "ext_references",
    init: function* (context: SeedBibleState) {
      yield offerReferenceDownload(context);

      const currentReferences = signal<ChapterReferences | null>(null);

      yield effect(() => {
        const readingState = context.app.currentReadingState.value;
        const book = readingState?.bookId;
        const chapter = readingState?.chapterNumber;

        if (!book || !chapter) {
          currentReferences.value = null;
          return;
        }

        let active = true;

        GetReferences({ bookId: book, chapter }).then((references) => {
          if (active) {
            currentReferences.value = references;
          }
        });

        return () => {
          active = false;
        };
      });

      const verseReferences = computed(() => {
        const chapterReferences = currentReferences.value;
        const readingState = context.app.currentReadingState.value;

        if (!chapterReferences || !readingState) {
          return null;
        }

        if (
          chapterReferences.book !== readingState.bookId ||
          chapterReferences.chapter !== readingState.chapterNumber
        ) {
          return null;
        }

        const currentVerseReferences: VerseReferences[] = [];

        for (const verse of readingState.tab.readingState.selectedVerses
          .value) {
          const verseReference = chapterReferences.references.find(
            (ref) => ref.verse === verse.verse.number
          );

          if (verseReference) {
            currentVerseReferences.push(verseReference);
          }
        }

        return currentVerseReferences;
      });

      const currentOpenedPane = signal<Pane | null>(null);

      yield context.tools.registerVerseToolbarTool({
        id: "show-references",
        title: {
          key: "title",
          ns: "ext_references",
          defaultValue: "References",
        },
        icon: () => (
          <span class="material-symbols-outlined">quick_reference_all</span>
        ),
        isVisible: () =>
          !!(verseReferences.value && verseReferences.value.length > 0),
        getItems: () => {
          return (
            verseReferences.value?.map((verseReference) => {
              return {
                id: `show-references-${verseReference.verse}`,
                title: {
                  key: "show-verse-references",
                  ns: "ext_references",
                  defaultValue: "Verse {{verse}} references",
                  options: { verse: String(verseReference.verse) },
                },
                onSelect: (() => {
                  const currentVerse = verseReference;
                  return () => {
                    const readingState = context.app.currentReadingState.value;
                    const book =
                      readingState?.tab.readingState?.title.value ?? "";
                    const chapter = readingState?.chapterNumber ?? 0;
                    const isMobile = context.app.isMobile.value;

                    openReferencePane({
                      seedBibleState: context,
                      currentPane: currentOpenedPane,
                      translationId: readingState?.translationId ?? "",
                      references: currentVerse.references,
                      title: `${book} ${chapter}:${currentVerse.verse} References`,
                      placement: isMobile ? "fullscreen" : "floating",
                    });
                  };
                })(),
                icon: () => (
                  <span class="material-symbols-outlined">
                    quick_reference_all
                  </span>
                ),
              };
            }) ?? []
          );
        },
        priority: 300,
      });
    },
  });
}
