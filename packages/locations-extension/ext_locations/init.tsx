import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { computed } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { LocationIcon } from "seed-bible/components";
import locations from "./locations.json";
import geoImporterPattern from "virtual:@pattern/geo-importer";

console.log("Loaded locations extension", geoImporterPattern);

interface PlaceData {
  place: string;
  geojson: string;
}

registerExtension({
  id: "ext_locations",
  init: function* (context) {
    const findLocationsInText = (text: string) => {
      text = text.toLowerCase();
      const foundPlaces = [];
      // const locations: Record<string, PlaceData> = tags.locations;
      const words = text.split(/[^\w]+/);
      console.log("words", words);
      for (const word of words) {
        const place = (locations as Record<string, PlaceData>)[
          word.toLowerCase()
        ];
        if (place) {
          console.log("Found place:", place);
          foundPlaces.push(place);
        }
      }

      return foundPlaces;
    };

    const findLocationsInVerses = (verses: ChapterVerse[]): PlaceData[] => {
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

    // const getPlaceGeoJsonUrl = (place: PlaceData) => {
    //   if (place.place === place.geojson) {
    //     return [
    //       `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${place.geojson}.geojson`,
    //       true,
    //     ] as const;
    //   } else {
    //     return [
    //       `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${place.geojson}.geojson`,
    //       false,
    //     ] as const;
    //   }
    // };

    const foundPlaces = computed(() => {
      const readingState = context.app.currentReadingState.value;

      if (!readingState) {
        return [];
      }

      const selectedVerses = readingState.tab.readingState.selectedVerses.value;
      return findLocationsInVerses(selectedVerses.map((v) => v.verse));
    });

    const showPlaceOnMap = async (place: PlaceData) => {
      console.log("Show place!", place);
      context.panes.openPane({
        id: "location-map",
        type: "detached",
        mapPortal: "map",
        pattern: geoImporterPattern,
      });

      // TODO: Fix
      // mapPortalBot.tags.mapPortalKind = "plane";
      // mapPortalBot.tags.mapPortalGridKind = "plane";

      // const [url] = getPlaceGeoJsonUrl(place);
      // const data = await web.get(url);

      // if (data.status !== 200) {
      //   // TODO: Fix this
      //   // os.toast("Something went wrong while retrieving the data");
      //   return;
      // }

      // loadMap(data.data);
    };

    yield context.tools.registerVerseToolbarTool({
      id: "show-locations",
      title: { key: "title", ns: "ext_locations", defaultValue: "Locations" },
      icon: () => <LocationIcon />,
      isVisible: () => foundPlaces.value.length > 0,
      getItems: () => {
        return foundPlaces.value.map((place) => ({
          id: `show-location-${place.place}`,
          title: {
            key: "show-location-place",
            ns: "ext_locations",
            defaultValue: `Show ${place.place} on map`,
            options: { place: place.place },
          },
          icon: () => <span></span>,
          onSelect: async () => {
            await showPlaceOnMap(place);
          },
        }));
      },
      priority: 100,
    });

    return {
      findLocationsInText,
      findLocationsInVerses,
      foundPlaces,
    };
  },
});
