import { computed } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { LocationIcon } from "seed-bible/components";
import {
  findLocationsInVerses,
  getPlaceAttribution,
  getPlaceGeoJsonUrl,
  toStandardGeoJson,
  type PlaceData,
} from "@seed-bible/bible-locations";

/** A place's GeoJSON file, fetched and put in standard coordinate order. */
export async function loadPlaceGeoJson(place: PlaceData) {
  const url = getPlaceGeoJsonUrl(place);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch GeoJSON for ${place.place}. Status: ${response.status}`
    );
  }
  return toStandardGeoJson(place, await response.json());
}

export default function initLocationsExtension() {
  registerExtension({
    id: "ext_locations",
    init: function* (context) {
      const foundPlaces = computed(() => {
        const readingState = context.app.currentReadingState.value;

        if (!readingState) {
          return [];
        }

        const selectedVerses =
          readingState.tab.readingState.selectedVerses.value;
        return findLocationsInVerses(selectedVerses.map((v) => v.verse));
      });

      const showPlaceOnMap = (place: PlaceData) => {
        context.map.openMap({
          id: `location-${place.place}`,
          title: place.place,
          label: place.place,
          load: () => loadPlaceGeoJson(place),
          attribution: getPlaceAttribution(place),
        });
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
            onSelect: () => showPlaceOnMap(place),
          }));
        },
        priority: 100,
      });
    },
  });
}
