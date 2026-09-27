import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { computed } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { LocationIcon, PortalComponent } from "seed-bible/components";
import locations from "./locations.json";
import geoImporterPattern from "virtual:@pattern/geo-importer";
import { v4 as uuid } from "uuid";

export interface PlaceData {
  place: string;
  geojson: string;
}

/**
 * What this extension hands to extensions that depend on it (the second
 * argument of their `init`), keyed under its id, `ext_locations`.
 */
export interface LocationsExtensionApi {
  findLocationsInText(text: string): PlaceData[];
  findLocationsInVerses(verses: ChapterVerse[]): PlaceData[];
  /** The entry for one place name, whatever its case, or null. */
  findLocation(name: string): PlaceData | null;
  /** Where a place's GeoJSON file lives. */
  getPlaceGeoJsonUrl(place: PlaceData): string;
}

export default function initLocationsExtension() {
  console.log("Loaded locations extension", geoImporterPattern);

  registerExtension({
    id: "ext_locations",
    init: function* (context) {
      const findLocationsInText = (text: string) => {
        text = text.toLowerCase();
        const foundPlaces: PlaceData[] = [];
        const seen = new Set<string>();
        const words = text.split(/[^\w]+/);
        for (const word of words) {
          const place = (locations as Record<string, PlaceData>)[
            word.toLowerCase()
          ];
          if (place && !seen.has(place.place)) {
            seen.add(place.place);
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

      const findLocation = (name: string): PlaceData | null =>
        (locations as Record<string, PlaceData>)[name.toLowerCase()] ?? null;

      const getPlaceGeoJsonUrl = (place: PlaceData): string =>
        place.place === place.geojson
          ? `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${place.geojson}.geojson`
          : `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${place.geojson}.geojson`;

      const foundPlaces = computed(() => {
        const readingState = context.app.currentReadingState.value;

        if (!readingState) {
          return [];
        }

        const selectedVerses =
          readingState.tab.readingState.selectedVerses.value;
        return findLocationsInVerses(selectedVerses.map((v) => v.verse));
      });

      const showPlaceOnMap = async (place: PlaceData) => {
        console.log("Show place!", place);

        const url = getPlaceGeoJsonUrl(place);
        const response = await fetch(url);

        if (response.status !== 200) {
          console.error(
            "Failed to fetch geojson data for place:",
            place,
            response
          );
          return;
        }

        const data = await response.text();

        // Generate the portal instance id once, here — not inside the pane's
        // render function — so re-renders (dragging/resizing the pane) reuse the
        // same `inst` and the map iframe keeps its document instead of
        // reloading.
        const inst = uuid();

        context.panes.openPane({
          placement: "floating",
          title: place.place,
          component: () => (
            <PortalComponent
              portal="map"
              portalType="map"
              pattern={geoImporterPattern}
              inst={inst}
              query={{
                mapData: data,
              }}
            />
          ),
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
        findLocation,
        getPlaceGeoJsonUrl,
      };
    },
  });
}
