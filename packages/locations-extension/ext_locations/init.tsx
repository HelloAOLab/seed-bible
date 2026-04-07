import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { computed, effect, untracked } from "@preact/signals";
import { registerExtension } from "seed-bible.app.api";

registerExtension({
  id: "ext_locations",
  init: function* (context) {
    const findLocationsInText = (text: string) => {
      text = text.toLowerCase();
      const foundPlaces = [];
      const locations: Record<string, { place: string; geojson: string }> =
        tags.locations;
      const words = text.split(/[^\w]+/);
      console.log("words", words);
      for (const word of words) {
        const place = locations[word.toLowerCase()];
        if (place) {
          console.log("Found place:", place);
          foundPlaces.push(place);
        }
      }

      return foundPlaces;
    };

    const findLocationsInVerses = (
      verses: ChapterVerse[]
    ): { place: string; geojson: string }[] => {
      let text = "";
      for (const verse of verses) {
        for (const content of verse.content) {
          if (typeof content === "string") {
            text += content;
          } else if ("text" in content) {
            text += content.text;
          }
        }
      }

      return findLocationsInText(text);
    };

    const foundPlaces = computed(() => {
      const readingState = context.app.currentReadingState.value;

      if (!readingState) {
        return [];
      }

      const selectedVerses = readingState.tab.readingState.selectedVerses.value;
      return findLocationsInVerses(selectedVerses.map((v) => v.verse));
    });

    yield context.tools.registerVerseToolbarTool({
      id: "show-locations",
      title: "Show locations",
      icon: () => <span>📍</span>,
      isVisible: () => foundPlaces.value.length > 0,
      onSelect: async () => {
        console.log("Show locations!", foundPlaces.value);
      },
      priority: 100,
    });

    // yield effect(() => {
    //     const unregisterTools: (() => void)[] = [];
    //     for(const placeData of foundPlaces.value) {
    //         const unregister = context.tools.registerVerseToolbarTool({
    //             id: `show-location-${placeData.place}`,
    //             title: `Show ${placeData.place} on map`,
    //             icon: () => <span>📍</span>,
    //             onSelect: async () => {
    //                 console.log('Show place!', placeData);
    //             },
    //             priority: 100,
    //         });
    //         unregisterTools.push(unregister);
    //     }

    //     return () => {
    //         for(const unregister of unregisterTools) {
    //             unregister();
    //         }
    //     };
    // });

    return {
      findLocationsInText,
      findLocationsInVerses,
      foundPlaces,
    };
  },
});
