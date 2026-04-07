import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { computed, signal } from "@preact/signals";
import { registerExtension } from "seed-bible.app.api";
import { getBoundsForGeoJson } from "ext_locations.geojson";

interface PlaceData {
  place: string;
  geojson: string;
}

registerExtension({
  id: "ext_locations",
  init: function* (context) {
    const existingLayerId = signal<string | null>(null);

    const findLocationsInText = (text: string) => {
      text = text.toLowerCase();
      const foundPlaces = [];
      const locations: Record<string, PlaceData> = tags.locations;
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

    const getPlaceGeoJsonUrl = (place: PlaceData) => {
      if (place.place === place.geojson) {
        return [
          `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${place.geojson}.geojson`,
          true,
        ] as const;
      } else {
        return [
          `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${place.geojson}.geojson`,
          false,
        ] as const;
      }
    };

    const foundPlaces = computed(() => {
      const readingState = context.app.currentReadingState.value;

      if (!readingState) {
        return [];
      }

      const selectedVerses = readingState.tab.readingState.selectedVerses.value;
      return findLocationsInVerses(selectedVerses.map((v) => v.verse));
    });

    const fixGeoJsonCoordinates = (geoJson: any) => {
      if (geoJson.type === "FeatureCollection") {
        for (const feature of geoJson.features) {
          fixGeoJsonCoordinates(feature);
        }
      } else if (geoJson.type === "Feature") {
        const coords = geoJson.geometry.coordinates;
        geoJson.geometry.coordinates = [
          parseFloat(coords[1]),
          parseFloat(coords[0]),
        ];
      }
    };

    const createLabelForGeoJson = (place: PlaceData, geojson: unknown) => {
      destroy(getBots("geojson_label", true));

      const bounds = getBoundsForGeoJson(geojson);

      if (!bounds) {
        console.warn(
          "Could not get bounds for GeoJSON, skipping label creation"
        );
        return;
      }

      const labelSize = bounds.dh ?? 700;

      create({
        space: "tempLocal",
        form: "sprite",
        pointable: false,
        orientationMode: "billboard",
        geojson_label: true,
        map: true,
        mapX: bounds.coordinates[0],
        mapY: bounds.coordinates[1],
        mapZ: 20,
        scaleZ: 1.1,
        scale: labelSize,
        label: place.place,
      });
    };

    const showPlaceOnMap = async (place: PlaceData) => {
      console.log("Show place!", place);
      context.panes.openPane({
        id: "location-map",
        type: "detached",
        mapPortal: "map",
      });
      mapPortalBot.tags.mapPortalKind = "plane";
      mapPortalBot.tags.mapPortalGridKind = "plane";

      const [url, needsFixup] = getPlaceGeoJsonUrl(place);
      const data = await web.get(url);

      if (data.status !== 200) {
        os.toast("Something went wrong while retrieving the data");
        return;
      }

      if (needsFixup) {
        fixGeoJsonCoordinates(data.data);
      }

      createLabelForGeoJson(place, data.data);

      existingLayerId.value = await os.addMapLayer("map", {
        type: "geojson",
        data: data.data,
      });
    };

    yield context.tools.registerVerseToolbarTool({
      id: "show-locations",
      title: "Locations",
      icon: () => <span>📍</span>,
      isVisible: () => foundPlaces.value.length > 0,
      getItems: (context) => {
        return foundPlaces.value.map((place) => ({
          id: `show-location-${place.place}`,
          title: `Show ${place.place} on map`,
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
