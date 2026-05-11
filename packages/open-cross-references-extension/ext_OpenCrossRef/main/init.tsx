/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import type { DiscoverCrossReferenceResult } from "seed-bible.managers.DiscoverManager";
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

const DATASET_ID = "open-cross-ref";

registerExtension({
  id: "open-cross-references-extension",
  init: function* (context: SeedBibleState) {
    yield context.discover.registerDiscoverProvider({
      id: "open-cross-references-discover-provider",
      description:
        "Discovers cross references from the Open Cross Ref dataset. See https://www.openbible.info/labs/cross-references/ for more information.",
      title: "Open Cross References",
      discover: async (discover) => {
        try {
          const data = await context.bibleData.api.getDatasetBookChapter(
            DATASET_ID,
            discover.book,
            discover.chapter
          );

          const crossReferences: DiscoverCrossReferenceResult[] =
            data.chapter.content.flatMap((verse) => {
              const filtered = verse.references.filter(
                (ref) => !ref.score || ref.score > 0
              );

              return filtered
                .map((ref) => ({
                  type: "cross-reference",
                  reference: {
                    book: discover.book,
                    chapter: discover.chapter,
                    verse: verse.verse,
                  },
                  crossReference: {
                    book: ref.book,
                    chapter: ref.chapter,
                    verse: ref.verse,
                  },
                }))
                .slice(0, 5); // Limit to top 5 cross references per verse for performance
            });

          return crossReferences;
        } catch (err) {
          console.error(
            "Error fetching cross references from Open Cross Ref dataset:",
            err
          );
          return [];
        }
      },
    });

    return {};
  },
});
