import { computed, effect, signal } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { LocationIcon } from "seed-bible/components";
import type {
  TheographicExtensionApi,
  TheographicPlaceEntry,
} from "@seed-bible/theographic-extension";

/** The Theographic extension's id, under which its API reaches `init`. */
const THEOGRAPHIC_EXTENSION_ID = "theographic-extension";

/** The places one chapter mentions, as last loaded. */
interface ChapterPlaces {
  book: string;
  chapter: number;
  places: TheographicPlaceEntry[];
}

export default function initLocationsExtension() {
  registerExtension({
    id: "ext_locations",
    // Which places a verse mentions comes from the Theographic dataset, which
    // aligns each place to the verses it appears in. Matching by verse number
    // rather than by name works whatever language the verse text is in.
    dependencies: [THEOGRAPHIC_EXTENSION_ID],
    init: function* (context, dependencies) {
      const theographic = dependencies[
        THEOGRAPHIC_EXTENSION_ID
      ] as TheographicExtensionApi;

      const selectedVerses = computed(
        () =>
          context.app.currentReadingState.value?.tab.readingState.selectedVerses
            .value ?? []
      );
      const chapterPlaces = signal<ChapterPlaces | null>(null);

      // Re-runs on every selection change, not just a change of chapter, so a
      // chapter that failed to load is tried again the next time a verse in
      // it is selected. The client shares in-flight requests and caches what
      // it gets, so the repeats cost nothing.
      yield effect(() => {
        const first = selectedVerses.value[0];
        if (!first) {
          return;
        }

        const { bookId: book, chapterNumber: chapter } = first;
        const loaded = chapterPlaces.peek();
        if (loaded?.book === book && loaded.chapter === chapter) {
          return;
        }

        let isCurrent = true;
        void theographic.getChapterPlaces(book, chapter).then(
          (places) => {
            if (isCurrent) {
              chapterPlaces.value = { book, chapter, places };
            }
          },
          (error: unknown) => {
            console.warn("Failed to load the places for", book, chapter, error);
          }
        );
        return () => {
          isCurrent = false;
        };
      });

      const foundPlaces = computed(() => {
        const loaded = chapterPlaces.value;
        if (!loaded) {
          return [];
        }

        const selected = new Set(
          selectedVerses.value
            .filter(
              (v) =>
                v.bookId === loaded.book && v.chapterNumber === loaded.chapter
            )
            .map((v) => v.verse.number)
        );
        return loaded.places.filter(
          (place) =>
            place.verses.some((verse) => selected.has(verse)) &&
            theographic.canMapPlace(place)
        );
      });

      yield context.tools.registerVerseToolbarTool({
        id: "show-locations",
        title: { key: "title", ns: "ext_locations", defaultValue: "Locations" },
        icon: () => <LocationIcon />,
        isVisible: () => foundPlaces.value.length > 0,
        getItems: () =>
          foundPlaces.value.map((place) => ({
            id: `show-location-${place.id}`,
            title: {
              key: "show-location-place",
              ns: "ext_locations",
              defaultValue: `Show ${place.name} on map`,
              options: { place: place.name },
            },
            icon: () => <span></span>,
            onSelect: () => theographic.openPlace(place),
          })),
        priority: 100,
      });
    },
  });
}
